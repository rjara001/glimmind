# Plan: Diagnosticar por qué `updateList` usa `maxAllowed=3000` en producción aunque el usuario es premium

## Contexto actual
- En Firestore, `users/{uid}/meta/main` muestra `tier: "premium"` y `cardQuota: 5000` para el usuario dueño de la lista.
- En producción, al intentar guardar/importar, el backend responde: `{"error":"Una lista no puede superar 3000 tarjetas."}`.
- El código de `functions/index.js` calcula `maxAllowed = isPremium ? PREMIUM_CARD_QUOTA : MAX_CARDS_PER_LIST;`. Si devuelve 3000, en ese momento `isPremium` era `false`.
- No sabemos si el problema es por `uid` incorrecto, meta leída de otro documento, código antiguo en producción, o frontend sin los fixes actuales.

## Hipótesis
1. El `uid` del token en prod no coincide con el `userId` de la lista ni con el `uid` del documento `meta/main` que vimos.
2. `oldData.userId` está vacío o es otro valor, así que `updateList` calcula `currentUserId` distinto y lee otra meta.
3. El backend en prod aún no tiene los logs nuevos y/o el frontend desplegado no es el último.
4. La lista se está actualizando por `createList` en vez de `updateList`, y `createList` también tiene un límite duro de 3000 antes de transaccionar.

## Pasos propuestos
1. **Agregar logs obligatorios en backend** (`functions/index.js`):
   - En `requireAuth`: loguear `uid` del token.
   - En `createList`: loguear `userId`, `isPremium`, `count`, `maxAllowed`, `cardCount`, `cardQuota`.
   - En `updateList`: loguear `uid`, `currentUserId`, `oldCount`, `newCount`, `isPremium`, `maxAllowed`, `meta`.
   - En `updateList` dentro del `runTransaction`: loguear `currentUserId`, `isPremium`, `delta`, `cardQuota`, `cardCount`.
   - En `setUserPremium`: loguear `uid`, `email`, `isEmulator`.
   - Importante: usar `console.error` para que aparezcan en `firebase functions:log`.
2. **Deployar backend y frontend** a producción con los logs.
3. **Capturar logs en vivo** mientras se ejecuta la importación en prod:
   - Terminal 1: `firebase functions:log --only createList,updateList -f`
   - Terminal 2: reproducir el error desde la app prod.
4. **Comparar**:
   - `uid` del token vs `userId` de la lista vs `uid` del documento `meta/main` que mostraste.
   - Si `isPremium` es `true` o `false` en el log exacto antes del `return 400`.
5. **Definir fix** según el hallazgo:
   - Si el `uid` no coincide: revisar autenticación en prod.
   - Si la meta es de otro usuario: corregir cómo se resuelve `currentUserId`.
   - Si el flujo correcto es `createList` y no `updateList`: ajustar límite o flujo.

## Validación
- Confirmar que el log de `updateList` muestra `isPremium=true` y `maxAllowed=5000` cuando se importan 5K.
- Confirmar que el `uid` del token coincide con el dueño de la lista y de `meta/main`.

## Pregunta pendiente / decisión necesaria
Una vez que veamos los logs, el fix puede ser:
- A) Asegurar que `currentUserId` siempre sea el `uid` del token autenticado cuando `oldData.userId` esté vacío.
- B) Cambiar el flujo de importación grande para que use `createList` una sola vez en vez de múltiples `updateList`.
- C) Otro.

¿Querés que avancemos ahora con la instrumentación de logs y el deploy, o preferís que primero revise algo más antes de tocar código?
