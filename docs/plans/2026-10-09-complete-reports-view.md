# Plan: Completar la vista de Reportes

**Fecha de creación**: 2026-10-09
**Estado**: PENDIENTE — diferido fuera de la MVP
**Origen**: el feature flag `reports: false` creado en `src/constants/featureFlags.ts`

Este plan documenta el trabajo necesario para completar la funcionalidad de Reportes.
El código base ya existe y está probado; falta cablearlo.

---

## Contexto

`ReportsView.tsx` tiene 67 líneas y ambas pestañas son un placeholder literal
(*"Esta funcionalidad está en desarrollo"*, `ReportsView.tsx:56`). No lee datos de
ningún servicio ni distingue guest de usuario real.

La lógica de negocio **ya está implementada y testeada, pero nunca se conectó**:

| Asset | Ubicación | Estado |
|---|---|---|
| `rankByPlays` | `src/utils/ranking.ts:52` | Implementada y testeada. **Cero imports en `src/`** |
| `rankByWeakness` | `src/utils/ranking.ts:68` | Implementada y testeada. **Cero imports en `src/`** |
| `summarizeSessions` | `src/utils/ranking.ts:85` | Implementada y testeada. **Cero imports en `src/`** |
| `loadSessions` | `src/store/gameStore.ts:676` | Implementada. **Sin call site de producción** |

Único importador de `ranking.ts`: `tests/utils/ranking.test.ts`.

Los datos ya se acumulan en `localStorage['glimmind_sessions']` (tope de 200 sesiones,
`activityService.ts:10`) desde que existe el guardado en `useGameLogic.ts:311-332`,
pero ningún componente los lee.

---

## Pregunta abierta (resolver antes de implementar)

**¿Qué fuente de datos alimenta el ranking?**

`rankByWeakness` y `rankByPlays` reciben `CardContext[]`. Hay dos fuentes candidatas
y no son equivalentes:

1. **`activity` (eventos `CardActivityEvent` con `cardId`)** — requiere filtrar por tipo
   de evento (`card_answered`) y agregar hits/misses. Tiene tope de 2000 eventos y
   descarta los más antiguos.
2. **Contadores en la propia `Association`** (`hits`, `misses`, `timesPlayed`) — ya están
   denormalizados en `glimmind_lists`. No tienen tope de recorte.

**Pendiente de verificación**: la forma exacta de `CardContext` en `src/utils/ranking.ts`
para confirmar cuál de las dos encaja. `CardContext` sugiere la opción 2, pero no está
confirmado.

---

## Trabajo requerido

### 1. Conectar el store al componente

`ReportsView` debe leer del store:

- `sessions` / `sessionsLoading` — vía `loadSessions()` (`gameStore.ts:676`), que ya
  normaliza el uid de guest a `''` y lee de `localStorage`.
- `activity` — vía `loadActivity()` (`gameStore.ts:645`), mismo comportamiento.
- `lists` — para la fuente 2 del ranking (contadores por `Association`).

Nota: `loadSessions` **no tiene call site de producción hoy**. Este plan lo agrega.

### 2. Implementar la pestaña "Resumen de juegos"

Renderizar `sessions` agrupadas por fecha, con `cardsPlayed`, `correct`, `incorrect`
y `byLevel`. Considerar `summarizeSessions` (`ranking.ts:85`) si sirve para agrupar.

### 3. Implementar la pestaña "Ranking"

Usar `rankByPlays` y `rankByWeakness` según la respuesta a la pregunta abierta.

### 4. Activar el feature flag

Cambiar `reports: false` → `reports: true` en `src/constants/featureFlags.ts`.

Los tres puntos de entrada ya están gateados y funcionan:
- Ruta `/reports` (`src/App.tsx`) — con el flag off redirige a `/dashboard`.
- Nav desktop (`src/components/Navbar.tsx`) — filtra `NAV_ITEMS`.
- Nav mobile (`src/components/layout/AppHeader.tsx`) — no renderiza el botón.

El copy de `SettingsView` también está branch-eado y volta automáticamente a la versión
completa cuando el flag esté on.

### 5. Tests existentes

`tests/components/ReportsView.test.tsx` tiene 2 tests que renderizan el componente
directamente y verifican el placeholder. **Reescribirlos** para el comportamiento nuevo.
`tests/components/ReportsView.gate.test.tsx` tiene tests que asertan el flag en `false` —
actualizarlos al activar.

---

## Verificación

- `npx tsc --noEmit` sin errores
- `npx vitest run` verde
- Manual: activar flag, navegar a Reports, confirmar que el ranking y el resumen muestran
  datos reales para un usuario autenticado **y** para un guest

---

## Fuera de alcance

- El historial (`HistoryView`, `loadActivity`, el toggle de Configuración) funciona
  correctamente y no se toca. Solo quedó con copy corregido mientras el flag esté off.
- No se toca `ranking.ts` ni `gameStore.loadSessions` más allá de conectarlos.

---

## Deuda técnica relacionada (no resuelta)

`activityService.ts:57-61` re-serializa los **2000 eventos completos** en cada flush
de 1 segundo durante juego activo. Estimado 400KB-1MB de JSON reescrito por flush.
No medido en runtime. Sobredimensiona el `glimmind_activity` de localStorage pero está
dentro de la cuota típica de ~5MB, así que `safeStringify` no lanza. Pendiente de
optimizar si se confirma el costo en dispositivos de gama media.