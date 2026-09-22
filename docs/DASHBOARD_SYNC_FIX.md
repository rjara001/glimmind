# Dashboard ↔ Game Panel Sync Fix

**Branch:** `fix/dashboard-sync-persistence`
**Date:** 2026-09-22
**Status:** Implemented with debug logging

---

## 1. Problema Inicial

> "Por alguna razón, luego de avanzar en el juego y el panel de progreso refleja correctamente este avance. Luego al volver al dashboard, el resumen del mazo no está sincronizado."

**Síntomas:**
- Juego: Panel de progreso (`CycleProgress`, `BigListCard`) muestra avance correcto
- Dashboard: Hero (`DashboardProgressHero`), Grid (`ListCard`), Recientes (`RecentListsStrip`) muestran 0% o datos viejos
- Refresh de página: Los datos vuelven al estado inicial (se pierde progreso)

---

## 2. Diagnóstico Root Cause

### Arquitectura Actual
```
┌─────────────────────────────────────────────────────────────┐
│                    useGameStore (Zustand)                   │
│  lists: AssociationList[]  ← Fuente de verdad centralizada │
└──────────────────────┬──────────────────────────────────────┘
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
┌─────────────────────┐    ┌─────────────────────┐
│   GameView          │    │   Dashboard         │
│   useGameLogic      │    │   useDashboardStats │
│   (estado LOCAL)    │    │   ListCard          │
│   GlimmindGame      │    │   RecentListsStrip  │
└─────────────────────┘    └─────────────────────┘
```

### Problemas Identificados

| # | Problema | Ubicación | Impacto |
|---|----------|-----------|---------|
| 1 | **GameView no sincroniza al salir** | `GameView.tsx` | Cambios en `useGameLogic` (local) nunca llegan al store |
| 2 | **Detección de cambios rota** | `useAppHandlers.ts:78-91` | `JSON.stringify` compara estructuras distintas (motor vs store) → siempre `true` → bloquea sync |
| 3 | **Merge cloud prefiere cloud** | `gameStore.ts:256-296` | Al recargar, `mergeCloudWithLocal` usa `localTime > cloudTime ? local : cloud` → cloud gana, progreso local se pierde |
| 4 | **Dashboard usa props, no store** | `App.tsx:262`, `Dashboard.tsx:28` | Dashboard recibe `lists={lists}` como prop; al navegar game→dashboard, React monta Dashboard nuevo con props viejas antes de que store actualice |
| 5 | **Definición inconsistente "aprendido"** | `useDashboardStats.ts`, `ListCard.tsx`, `RecentListsStrip.tsx` | Dashboard cuenta `isArchived`; Game panel usa `computeStateBreakdown()` → `isLearned && !isArchived` |

---

## 3. Solución Implementada

### 3.1 GameView: Sync automático al salir/terminar
**Archivo:** `src/components/views/GameView.tsx`

```typescript
useEffect(() => {
  const syncToStore = () => {
    if (gameState.associations.length > 0) {
      onUpdateAssociations(gameState.associations);
    }
  };
  if (gameView === "summary") syncToStore();  // Al terminar partida
  return () => syncToStore();                  // Al navegar fuera (unmount)
}, [gameView, gameState.associations, onUpdateAssociations]);
```

### 3.2 handleUpdateAssociations: Detección real de cambios + timestamps
**Archivo:** `src/hooks/app/useAppHandlers.ts`

```typescript
// ANTES (roto):
const { createModeList } = useGameStore.getState(); // ❌ No existe
if (createModeList) return;
if (JSON.stringify(currentList.associations) === JSON.stringify(updatedAssociations)) return;

// DESPUÉS (field-by-field):
const prevMap = new Map(currentList.associations.map(a => [a.id, a]));
const hasChanges = updatedAssociations.some((a) => {
  const prev = prevMap.get(a.id);
  if (!prev) return true;
  return (
    prev.isLearned !== a.isLearned ||
    prev.currentCycle !== a.currentCycle ||
    prev.status !== a.status ||
    (prev.hits ?? 0) !== (a.hits ?? 0) ||
    (prev.misses ?? 0) !== (a.misses ?? 0) ||
    (prev.timesPlayed ?? 0) !== (a.timesPlayed ?? 0) ||
    (prev.lastPlayedAt ?? 0) !== (a.lastPlayedAt ?? 0)
  );
});
// + asegura updatedAt en todas las associations
const withTimestamps = updatedAssociations.map(a => ({
  ...a,
  updatedAt: a.updatedAt ?? Date.now()
}));
```

**Archivo:** `src/store/gameStore.ts` - `updateAssociations` ahora actualiza `list.updatedAt`:

```typescript
const updatedLists = lists.map(l =>
  l.id === listId ? { ...l, associations, updatedAt: Date.now() } : l  // ← NUEVO
);
```

**Archivo:** `src/hooks/app/useAppHandlers.ts` - `handleUpdateList` también:

```typescript
const listWithTimestamp = { ...list, updatedAt: Date.now() };  // ← NUEVO
```

### 3.3 Merge Cloud ↔ Local: Prefiere local (progreso de juego)
**Archivo:** `src/store/gameStore.ts`

```typescript
// NUEVA: mergeAssociationsPreferLocal (nivel asociación)
function mergeAssociationsPreferLocal(localAssociations, cloudAssociations) {
  const byId = new Map(cloudAssociations.map(a => [a.id, a]));
  for (const assoc of localAssociations) {
    const existing = byId.get(assoc.id);
    if (!existing) { byId.set(assoc.id, assoc); continue; }
    const localTime = getAssociationTimestamp(assoc);
    const cloudTime = getAssociationTimestamp(existing);
    // Prefiere local si: no tiene timestamp (estado actual juego) O timestamp >= cloud
    const preferLocal = localTime === 0 || localTime >= cloudTime;
    if (preferLocal) byId.set(assoc.id, assoc);
  }
  return Array.from(byId.values());
}

// NUEVA: mergeCloudWithLocalPreferLocal (nivel lista + protección de progreso)
function mergeCloudWithLocalPreferLocal(cloudLists, localLists, currentUserId) {
  // ... merge por ID ...
  for (const cloudList of cloudLists) {
    const localList = localById.get(cloudList.id);
    // ...
    const mergedAssociations = mergeAssociationsPreferLocal(localList.associations, cloudList.associations);
    
    // PROTECCIÓN DE PROGRESO: si local tiene más aprendidas que cloud, GANIA LOCAL
    const localLearned = localList.associations?.filter(a => a.isLearned && !a.isArchived).length || 0;
    const cloudLearned = cloudList.associations?.filter(a => a.isLearned && !a.isArchived).length || 0;
    const hasLocalProgress = localLearned > cloudLearned;
    const preferLocalList = hasLocalProgress || localTime >= cloudTime;
    
    const listData = preferLocalList ? localList : cloudList;
    // ...
  }
}
```

**Fix crítico adicional:** `updateAssociations` ahora actualiza `list.updatedAt = Date.now()` para que el merge a nivel lista detecte correctamente la frescura.

### 3.4 Dashboard: Suscripción directa al store
**Archivos:** `src/components/views/Dashboard.tsx`, `src/App.tsx`, `src/types/dashboard.ts`

```typescript
// ANTES: props
<Dashboard lists={lists} ... />

// Dashboard.tsx
export const Dashboard: React.FC<DashboardProps> = ({ lists, ... }) => { ... }

// DESPUÉS: selector Zustand directo
export const Dashboard: React.FC<DashboardProps> = ({ ... }) => {
  const lists = useGameStore((state) => state.lists); // ← Reactivo automático
  ...
}
```

### 3.5 Definición unificada "aprendido" = `isLearned && !isArchived`
**Archivos:** `src/hooks/dashboard/useDashboardStats.ts`, `src/components/views/dashboard/ListCard.tsx`, `src/components/views/dashboard/RecentListsStrip.tsx`

```typescript
import { computeStateBreakdown } from "../../../utils/progress"; // Mismo que CycleProgress/BigListCard

const breakdown = computeStateBreakdown(allAssociations);
const learnedCount = breakdown.aprendidas; // isLearned === true && !isArchived
// Usado para: totalLearned, achievementPercent, percentage
```

---

## 4. Flujo Final

```
Usuario juega
    │
    ▼
useGameLogic actualiza estado local (GlimmindGame)
    │
    ▼ [Termina partida O navega fuera]
GameView cleanup → onUpdateAssociations(gameState.associations)
    │
    ▼
handleUpdateAssociations detecta cambios reales (field-by-field)
    │
    ▼
updateAssociations(listId, associations) en store
    │
    ├─► set({ lists: updatedLists })          ← Estado reactivo
    ├─► localStorage.setItem(...)             ← Persistencia inmediata
    └─► syncToCloud(listId)                   ← Cloud async (best effort)
    │
    ▼
Dashboard/Editor suscritos via useGameStore((s) => s.lists)
    │
    ▼ [Recarga página]
loadInitialData:
  1. Lee localStorage (tiene progreso reciente)
  2. Fetch cloud
  3. mergeCloudWithLocalPreferLocal(local, cloud)
     → Gana local si timestamp >= cloud (progreso de juego)
  4. Guarda merged en localStorage + store
```

---

## 5. Archivos Modificados (9)

| Archivo | Cambio Principal |
|---------|-----------------|
| `src/components/views/GameView.tsx` | +19 líneas: sync effect on unmount/game-finish |
| `src/hooks/app/useAppHandlers.ts` | +25 líneas: field-by-field change detection, updatedAt en associations y list |
| `src/store/gameStore.ts` | +85 líneas: `mergeCloudWithLocalPreferLocal`, `mergeAssociationsPreferLocal`, list.updatedAt, logs debug, protección de progreso |
| `src/components/views/Dashboard.tsx` | Lee `lists` via selector Zustand (no props) |
| `src/types/dashboard.ts` | Quita `lists` de `DashboardProps` |
| `src/App.tsx` | Quita `lists={lists}` prop |
| `src/hooks/dashboard/useDashboardStats.ts` | Usa `computeStateBreakdown()` |
| `src/components/views/dashboard/ListCard.tsx` | Usa `computeStateBreakdown()` |
| `src/components/views/dashboard/RecentListsStrip.tsx` | Usa `computeStateBreakdown()` |

---

## 6. Flujo Final (Actualizado)

```
Usuario juega
    │
    ▼
useGameLogic actualiza estado local (GlimmindGame)
    │
    ▼ [Termina partida O navega fuera]
GameView cleanup → onUpdateAssociations(gameState.associations)
    │
    ▼
handleUpdateAssociations detecta cambios reales (field-by-field)
    │
    ▼
updateAssociations(listId, associations) en store
    │
    ├─► set({ lists: updatedLists })          ← Estado reactivo
    ├─► list.updatedAt = Date.now()           ← Timestamp fresco para merge
    ├─► localStorage.setItem(...)             ← Persistencia inmediata
    └─► syncToCloud(listId)                   ← Cloud async (best effort)
    │
    ▼
Dashboard/Editor suscritos via useGameStore((s) => s.lists)
    │
    ▼ [Recarga página]
loadInitialData:
  1. Lee localStorage (tiene progreso reciente + updatedAt fresco)
  2. Fetch cloud
  3. mergeCloudWithLocalPreferLocal(local, cloud):
     a) mergeAssociationsPreferLocal: prefiere local si localTime >= cloudTime
     b) PROTECCIÓN: si localLearned > cloudLearned → prefiere SIEMPRE local
  4. Guarda merged en localStorage + store
```
## 7. Debug Logs (Temporales)

En consola del navegador al recargar:
```
[STORE] currentLocalLists count= N
[STORE] local list: id=xxx associations=15 updatedAt=1726945200000 sample assoc updatedAt=1726945205000
[STORE] cloud list: id=xxx associations=15 updatedAt=1726940000000 sample assoc updatedAt=1726940000000
[mergeAssociationsPreferLocal] id=abc localTime=1726945205000 cloudTime=1726940000000
[mergeCloudWithLocalPreferLocal] list=abc localTime=1726945200000 cloudTime=1726940000000 localLearned=3 cloudLearned=0
[STORE] merged list: id=xxx associations=15 updatedAt=1726945200000 sample assoc isLearned=true
```

**Verificar:**
- `localTime > cloudTime` → `isLearned=true` en merged
- `localLearned > cloudLearned` → "PROTECCIÓN" activada, local gana aunque timestamp sea menor

---

## 8. Tests

```bash
# Tests clave pasan
npx vitest run tests/store/gameStore.test.ts      # 10 passed
npx vitest run tests/services/gameEngine.test.ts  # 90 passed
npx vitest run tests/utils/progress.test.ts       # 23 passed
```

TypeScript: Sin errores nuevos en archivos modificados (solo preexistentes en codebase).

---

## 9. Pendientes / Follow-up

- [ ] Quitar logs de debug en `gameStore.ts` tras validar en staging
- [ ] Verificar comportamiento en modo Guest (solo localStorage)
- [ ] Confirmar que `syncToCloud` no sobrescribe progreso local en background
- [ ] Considerar debounce en `handleUpdateAssociations` si hay muchos updates rápidos