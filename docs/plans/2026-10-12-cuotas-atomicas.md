# Cuotas atómicas: reservar antes de gastar

**Fecha:** 2026-10-12
**Resuelve:** [`../issues/done/2026-10-12-cuotas-no-atomicas.md`](../issues/done/2026-10-12-cuotas-no-atomicas.md)
**Alcance:** los cuatro medidores con costo — AI decks, TTS, STT, traducción.

---

## 1. El defecto

Cada medidor sigue la misma secuencia de tres fases:

```
leer el contador  →  comparar con el límite  →  llamar a la API paga  →  escribir el nuevo valor
```

La comparación y la escritura están en dos operaciones separadas, sin transacción ni
reserva. N peticiones concurrentes del mismo usuario leen la misma cifra inicial,
todas pasan el chequeo y todas consumen. El techo realizado es
`límite × concurrencia`, no `límite`.

El parche ciego también pierde incrementos: la última escritura gana, así que una
ráfaga de escrituras concurrentes registra **menos** de lo gastado. El
enforcement se degrada hacia abajo: la cuota nunca parece agotada.

### Dónde está

| Medidor | Lectura | Chequeo | Escritura ciega |
|---|---|---|---|
| AI decks | `createDeckFromText.js:69`, `youtubeDeckRoutes.js:126,147` | `:75` / `:138,149` | `set(..., {merge:true})` |
| TTS | `chirpTtsService/quota.js:29-30` | `:46,61` | `db.batch()` `:71-93` |
| STT | `sttService/quota.js:31-32` | `:46,66` | `db.batch()` `:93-114` |
| Traducción | `translationQuota.js:22` | `:37,52` | `db.batch()` `:72-96` |

---

## 2. Por qué reserva y no "escribir al final"

La alternativa a reservar es mantener el orden actual y hacer la escritura
atómica con `FieldValue.increment()`. Eso arregla los incrementos perdidos pero
**no** el defecto principal: entre la comparación y la escritura sigue habiendo
una ventana en la que veinte peticiones ven el mismo cero. La llamada paga es la
que multiplica el gasto, y ocurre dentro de esa ventana.

La reserva invierte el orden: el incremento ocurre **antes** de la llamada, de
modo que la última de las veinte peticiones concurrentes ve el valor ya
incrementado y es rechazada. Si la llamada falla, la reserva se reembolsa.

```
reservar (transacción)  →  llamar a la API paga  →  [si falla] reembolsar
```

`runTransaction` es lo que hace atómica la primera fase: compara e incrementa en
la misma transacción, así que el par no puede quedar desincronizado.

---

## 3. El primitivo

`backend/src/functions/src/utils/meteredQuota.js`, tres exports.

### `runMeteredCall(db, { spec, spend })`

Empareja la reserva con el reembolso. Si `spend` lanza, reembolsa y re-lanza el
error original. Esto hace **estructuralmente imposible** reservar sin
reembolsar, que es la forma en que estos sistemas fallan cuando se implementa la
reserva sin el reembolso.

Si el reembolso falla, se registra y se re-lanza el error original igual: un
reembolso fallido no debe enmascarar por qué falló la llamada paga.

### `reserveInTransaction(db, spec)`

Lee todos los contadores del spec dentro de la transacción, resuelve período y
tier, calcula el siguiente valor, compara con el límite y escribe. Si no cabe,
lanza — la transacción se aborta sin escribir nada.

### `refundInTransaction(db, spec)`

Reversa atómica: `max(0, actual − delta)`, **guardada por período**. Si el día o
el mes rotó entre la reserva y el reembolso, el reembolso es no-op: descontar del
contador nuevo bajaría la cifra de un período que nunca gastó nada.

### El spec

```js
{
  tierRef,            // doc que resuelve el tier; puede ser el mismo que un counter
  counters: [{
    ref,              // DocumentReference
    delta,            // número a sumar (ej. costPercent, charCount, audioSeconds)
    limit,            // número, o resolveLimit(tier) → número
    periodField,      // campo que guarda el período ('monthKey', 'dateKey', ...)
    periodValue,      // valor del período actual
    onExceed,         // (used, limit) → Error  — conserva los códigos existentes
    write,            // (nextUsed) → campos extra a escribir en el mismo doc
  }]
}
```

Los cuatro medidores quedan como **literales de datos**. La forma del spec sigue
la lectura de lista de `listService/crud.js`, que ya hace check-then-write
atómico para `cardCount` — este cambio generaliza ese patrón a los medidores.

---

## 4. Los cuatro medidores

### AI decks — `services/aiDeckQuota.js` (nuevo)

La lógica vive hoy duplicada entre `createDeckFromText.js:66-88,148-154` y
`youtubeDeckRoutes.js:123-151,240-246`. Se extrae a un solo módulo.

- **Usuario:** `users/{uid}/meta/main`, campo `ytAiUsedToday`, período `ytAiDateKey`, delta `tier.costPercent`, límite `getAiDailyLimit(tier)`.
- **Global:** `usage/global`, campo `aiCalls`, período `dateKey`, delta 1, límite `GLOBAL_AI_DAILY_CAP`.
- **Reembolso:** ambos.

### TTS — `services/chirpTtsService/quota.js`

- **Usuario:** `usage/chirpTts/users/{uid}/months/{monthKey}`, `charsUsed`, delta `charCount`, límite por tier.
- **Global:** `usage/chirpTts/global/{monthKey}`, `charsUsed`, delta `charCount`, límite `CHIRP_TTS_GLOBAL_LIMIT`.

### STT — `services/sttService/quota.js`

Igual que TTS con `audioSecondsUsed` y `audioSeconds`.

### Traducción — `services/translationQuota.js`

- **Usuario:** `users/{uid}/usage/translation_{monthKey}`, `charactersTranslated`.
- **Global:** `usage_stats/translation_global_{monthKey}`, `totalCharactersTranslated`.

---

## 5. Tres restricciones que impone el código existente

### a) La reserva IA va después del cache

`youtubeDeckRoutes.js:132-136` devuelve el resultado cacheado **antes** de
cualquier chequeo de cuota. Hoy los cache hits son gratis. Poner la reserva antes
de esa línea haría que cada cache hit cobrara puntos.

La reserva se inserta entre el lookup del caché y `extractVocabulary`.

### b) STT es spend-then-check hoy

`sttRoutes.js:37` llama a Google y recién en `:50` verifica la cuota. Un usuario
sobre el límite **ya pagó** la transcripción antes de recibir el 429. Esto es peor
que el defecto que describe el issue, y mover la reserva antes de la llamada es
parte del fix, no un extra.

`NO_SPEECH` (`:41-45`) hoy no cobra: el camino de error retorna antes del chequeo.
El refund preserva ese comportamiento.

### c) `createDeckFromText` sigue vivo

`docs/removed-features.md` lo da por retirado del producto, pero
`CreateYouTubeDeckModal.tsx:187` lo llama como fallback de transcripción manual.
Se arregla igual.

---

## 6. Decisiones tomadas

### `NO_SPEECH` no cobra en STT

Google factura la request aunque no haya voz. Cobrarla sería más correcto desde el
punto de vista de costo, pero cambia lo que el usuario paga por una transcripción
que no recibió. Preservar el comportamiento actual; es una decisión de negocio,
no técnica, y no se toma acá.

### El doc `meta` se crea con `metaDefaults()`

Hoy `createDeckFromText.js:149` hace `metaRef.set(..., {merge:true})`, que crea
el doc con solo tres campos si no existe — sin `tier` ni `cardQuota`. Está
enmascarado porque `getQuota` corre en el bootstrap del dashboard y siempre crea
el doc primero, pero el orden no está garantizado.

Se endurece usando `metaDefaults()` como en `listService/crud.js:111,174`. Es la
línea que el cambio ya reescribe y evita que la reserva cree un doc de meta
incompleto.

---

## 7. Verificación

Los tests jest del backend **no corren en CI**: `vite.config.ts` incluye
`['src/**/*.test.ts(x)', 'tests/**/*.test.ts(x)']` y `.github/workflows/ci.yml`
solo ejecuta `npx vitest run`. El único patrón backend vivo es
`tests/services/stripeWebhook.test.ts`, que precarga `require.cache` de
`firebase-admin/firestore`.

El test nuevo sigue ese patrón y prueba la property que importa:

| Test | Qué demuestra |
|---|---|
| 20 reservas concurrentes de 100 puntos contra límite 100 | exactamente 1 éxito. Falla hoy. |
| Refund resta y clampa en 0 | no queda negativo |
| Refund con período rotado | no-op, no toca el contador nuevo |
| Reintentos de Gemini | reintentan dentro de la misma reserva, no abren una segunda |

El fake de `runTransaction` serializa las transacciones con una cadena de
promesas. Sin esa serialización el test de concurrencia no probaría nada.

---

## 8. Hallazgos parkearos (§12)

No se arreglan acá. Van a `docs/issues/P1/`.

| Hallazgo | Archivo |
|---|---|
| `audioSeconds` se calcula de `audioDuration` que envía el cliente, sin validar contra el audio real. `transcribeExistingAudio` además no tiene tope de duración. | `sttRoutes.js:28,85` |
| `sttRoutes.js:91` llama `sendAudioToGoogleSpeechRecognitionRecognize`, que no existe en `sttService/api.js`. El endpoint `transcribeExistingAudio` lanza en runtime y no tiene callers. | `sttRoutes.js:91` |

---

## 9. Fuera de alcance

`docs/dashboard-api-trigger-analysis.md` no requiere cambio: §33 lista archivos
de bootstrap del dashboard y funciones nuevas disparadas en esa carga. Ninguna
de las cuatro rutas metered entra en ese flujo.

El issue hermano [`P0/2026-10-12-rutas-ia-sin-rate-limit.md`](../issues/P0/2026-10-12-rutas-ia-sin-rate-limit.md) sigue abierto: la reserva corrige el gasto, no la concurrencia de memoria.