# Fix F5 Progress Loss - Update Strategy Document

**Fecha:** 2026-09-22
**Branch:** `fix/refresh-progress-persistence`
**Estado:** Plan aprobado, pendiente implementación

---

## 1. Problema

**Usuario autenticado:** Juega → F5 (refresh navegador) → Dashboard muestra 0% progreso (se pierde todo avance).

**Usuario guest:** Funciona correctamente (persiste progreso tras F5).

---

## 2. Root Cause

### Arquitectura de Bootstrap Actual

```typescript
// src/hooks/app/useAppBootstrap.ts:45-51
useEffect(() => {
  if (user && user.uid !== GUEST_UID) {
    useGameStore.getState().loadDashboardData();  // ❌ AUTENTICADOS: Solo cloud, NO merge
  } else {
    useGameStore.getState().loadInitialData();     // ✅ GUESTS: localStorage + merge prefer-local
  }
}, [user]);
```

### Diferencia Crítica

| Función | Qué hace | Merge? |
|---------|----------|--------|
| `loadDashboardData` | Fetch cloud (lists+progress+quota+settings) → **overwrite** store + localStorage | ❌ NO |
| `loadInitialData` | Lee localStorage → fetch cloud lists → **mergeCloudWithLocalPreferLocal** → save | ✅ SÍ (solo lists) |

**Resultado:** Autenticados nunca usan la lógica de merge que protege el progreso local.

---

## 3. Estrategia de Merge por Tipo de Dato

| Dato | Estrategia | Justificación |
|------|------------|---------------|
| **Lists (associations)** | `mergeCloudWithLocalPreferLocal` (existente) - Local gana si `timestamp ≥ cloud` O `localLearned > cloudLearned` | Progreso de juego es prioritario; cloud puede estar desactualizado |
| **Progress** | **Last-write-wins** por `updatedAt` (local si más nuevo) | Ambos pueden tener cambios legítimos; el más reciente gana |
| **Settings** | **Last-write-wins** por `updatedAt` (local si más nuevo) | Usuario puede cambiar settings en múltiples dispositivos |
| **Quota** | **Cloud siempre gana** (server-authoritative) | Cuota es fuente de verdad del servidor |
| **Duplicados (mismo término)** | `normalizeAssociations` preserve progress: `max(counters)`, `OR(bools)`, `max(timestamps)` | No perder historial al deduplicar términos |

---

## 4. Plan de Implementación (4 Fases Secuenciales)

### Fase 1a: Unificar Bootstrap (Crítico - ~5 min)
**Archivo:** `src/hooks/app/useAppBootstrap.ts`
- Eliminar `if/else` bootstrap
- **Todos** usuarios (authed + guest) llaman `loadInitialData()`

### Fase 1b: Extender `loadInitialData` con Progress/Quota/Settings (Crítico - ~30 min)
**Archivo:** `src/store/gameStore.ts` - función `loadInitialData`
- Después del merge de lists (línea ~844), para usuarios autenticados:
  - Fetch paralelo: `progressService.fetchProgress`, `quotaService.fetchQuota`, `settingsService.fetchSettings`
  - Merge progress: last-write-wins por `updatedAt`
  - Merge settings: last-write-wins por `updatedAt`
  - Quota: cloud wins
  - Save a store + localStorage

### Fase 2: Fix `syncFromCloud` usa merge nuevo (Alto - ~5 min)
**Archivo:** `src/store/gameStore.ts` línea 912
- Cambiar `mergeCloudWithLocal` → `mergeCloudWithLocalPreferLocal`
- Botón "Sincronizar desde nube" deja de borrar progreso local

### Fase 3: `normalizeAssociations` preserve progress (Medio - ~20 min)
**Archivo:** `src/utils/normalizeAssociation.ts` líneas 122-133
- Al mergear duplicados (mismo término case-insensitive):
  - `hits/misses/timesPlayed` → `Math.max()`
  - `currentCycle` → `Math.max()`
  - `isLearned/isArchived` → `OR`
  - `lastPlayedAt/updatedAt` → `Math.max()`
  - `createdAt` → `Math.min()`

### Fase 4: Cleanup (Opcional - ~15 min)
- Eliminar `loadDashboardData` de `gameStore.ts` (líneas 870-894) y tipo en interface
- Eliminar `dashboardService.ts` si sin referencias
- Remover debug logs en `gameStore.ts` (líneas 330, 364, 528, 535, 834-836, 842)

---

## 5. Archivos a Modificar

| Fase | Archivos |
|------|----------|
| 1a | `src/hooks/app/useAppBootstrap.ts` |
| 1b | `src/store/gameStore.ts` |
| 2 | `src/store/gameStore.ts` |
| 3 | `src/utils/normalizeAssociation.ts` |
| 4 | `src/store/gameStore.ts`, `src/services/dashboardService.ts` (eliminar), `tests/store/gameStore.test.ts`, `tests/utils/normalizeAssociation.test.ts` (nuevo) |

---

## 6. Tests a Agregar/Actualizar

### `tests/store/gameStore.test.ts`
1. `loadInitialData` authed: merge lists prefer-local + fetch progress/quota/settings con last-write-wins
2. `syncFromCloud` usa `mergeCloudWithLocalPreferLocal`
3. Progress merge: local wins si `local.updatedAt > cloud.updatedAt`
4. Settings merge: local wins si `local.updatedAt > cloud.updatedAt`

### `tests/utils/normalizeAssociation.test.ts` (nuevo)
5. `normalizeAssociations` preserve progress on duplicate merge

---

## 7. Verificación por Fase

| Fase | Verificación Automática | Verificación Manual |
|------|------------------------|---------------------|
| 1a | `npx tsc --noEmit` = 0 errors | Login → Play → F5 → Dashboard muestra progreso |
| 1b | `npx tsc --noEmit` = 0 errors | F5 → Progress + Settings + Quota preservados |
| 2 | `npx tsc --noEmit` = 0 errors | Click "Sync from cloud" → No pierde progreso |
| 3 | `npx tsc --noEmit` = 0 errors + `vitest run tests/utils/normalizeAssociation.test.ts` = Pass | N/A |
| 4 | `npx tsc --noEmit` = 0 errors + `vitest run` = All pass | Full regression test |

---

## 8. Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| `quotaService.fetchQuota` no existe | Verificar en `src/services/` - usar `userService.getQuota` si necesario |
| Race condition en `loadInitialData` | Ya tiene `requestId` guard, mantener |
| `UserProgress` no tiene `updatedAt` | Verificar tipo; añadir si falta |
| `UserSettings` ya tiene `updatedAt` | Confirmado en línea 659 |
| Datos legacy sin timestamps | `getAssociationTimestamp` retorna 0 → merge prefiere local (timestamp 0 = "estado actual de juego") |

---

## 9. Criterios de Éxito

- [ ] Usuario autenticado juega → F5 → Dashboard muestra progreso correcto
- [ ] Usuario autenticado juega → navega Dashboard → progreso visible (sin F5)
- [ ] Botón "Sincronizar desde nube" no borra progreso local
- [ ] Guest mode sigue funcionando
- [ ] `npx tsc --noEmit` = 0 errors
- [ ] `vitest run` = all tests pass
- [ ] No debug logs en consola en producción

---

## 10. Referencias

- Fix previo relacionado: `docs/DASHBOARD_SYNC_FIX.md` (merge prefer-local para lists)
- `src/store/gameStore.ts:298-372` - `mergeCloudWithLocalPreferLocal` y `mergeAssociationsPreferLocal`
- `src/utils/normalizeAssociation.ts:85-137` - `normalizeAssociations`
- `src/hooks/app/useAppBootstrap.ts:45-51` - Bootstrap actual