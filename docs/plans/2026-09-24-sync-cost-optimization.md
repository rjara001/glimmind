# Plan: Sync Cost Optimization — Session-End + Periodic Delta Sync

**Fecha:** 2026-09-24  
**Autor:** Agent  
**Estado:** Aprobado para implementación

---

## Objetivo

Reducir costos de GCP (Firestore writes, Cloud Functions, egress) manteniendo sincronización confiable del progreso del usuario.

**Meta:** ~95% reducción en writes/sesión (50→1-2), ~90% reducción en reads/carga.

---

## Estrategia: Dos Pilares

### 1. Session-End Sync (GARANTIZADO, SIEMPRE)
- Trigger: `beforeunload` + `visibilitychange:hidden` + `pagehide` (mobile PWA/iOS)
- Método: `fetch(..., { keepalive: true })` → Cloud Function `updateListFields`
- Payload: Delta completo de la sesión (con chunking si >50KB)
- **No opcional, no debounced, no best-effort**

### 2. Periodic Sync (CONDICIONAL, DURANTE JUEGO)
- Trigger: Intervalo fijo (configurable por tier)
- Condición: Solo si `pendingDeltas[listId].length > 0`
- Método: Async, best-effort, con retry/backoff
- Payload: Delta acumulado desde último sync

---

## Cambios de Código

### A. Estado de Sync (`src/store/gameStore.ts`)

```typescript
interface SyncState {
  pendingDeltas: Map<string, AssociationDelta[]>;  // listId → deltas
  lastSyncedAt: Map<string, number>;                // listId → timestamp
  syncInProgress: Set<string>;                      // listIds en vuelo
}

interface AssociationDelta {
  id: string;
  fields: Partial<Pick<Association,
    'isLearned' | 'currentCycle' | 'status' |
    'hits' | 'misses' | 'timesPlayed' | 'lastPlayedAt'
  >>;
  updatedAt: number;
}

// Nuevas actions:
addPendingDelta(listId: string, deltas: AssociationDelta[]): void
flushSync(listId: string): Promise<void>           // periodic/manual
flushAllPendingSyncs(options?: { keepalive: boolean }): Promise<void>  // session-end
```

### B. Session-End Listener (`src/hooks/app/useAppBootstrap.ts`)

```typescript
useEffect(() => {
  const flush = () => get().flushAllPendingSyncs({ keepalive: true });
  
  window.addEventListener('beforeunload', flush);
  window.addEventListener('pagehide', flush);           // Mobile PWA / iOS Safari
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  
  return () => {
    window.removeEventListener('beforeunload', flush);
    window.removeEventListener('pagehide', flush);
  };
}, []);
```

### C. Periodic Sync Hook (`src/hooks/game/usePeriodicSync.ts` — NUEVO)

```typescript
export function usePeriodicSync() {
  const { pendingDeltas, flushSync } = useGameStore();
  
  useEffect(() => {
    const interval = setInterval(() => {
      pendingDeltas.forEach((deltas, listId) => {
        if (deltas.length > 0) flushSync(listId);
      });
    }, SYNC_CONFIG.periodicIntervalMs); // 5min free / 2min premium
    
    return () => clearInterval(interval);
  }, [pendingDeltas, flushSync]);
}
```

### D. Delta Computation (`src/utils/syncDelta.ts` — NUEVO)

```typescript
function computeDelta(prev: Association[], next: Association[]): AssociationDelta[] {
  const prevMap = new Map(prev.map(a => [a.id, a]));
  return next
    .filter(a => {
      const p = prevMap.get(a.id);
      return !p || hasMeaningfulChange(p, a);
    })
    .map(a => ({
      id: a.id,
      fields: extractSyncFields(a),
      updatedAt: a.updatedAt ?? Date.now()
    }));
}

function extractSyncFields(a: Association) {
  return {
    isLearned: a.isLearned,
    currentCycle: a.currentCycle,
    status: a.status,
    hits: a.hits,
    misses: a.misses,
    timesPlayed: a.timesPlayed,
    lastPlayedAt: a.lastPlayedAt
  };
}
```

### E. Cloud Function: `updateListFields` (`backend/src/functions/lists/updateListFields.ts` — NUEVO)

```typescript
export const updateListFields = onCall(async (request) => {
  const { listId, baseUpdatedAt, deltas } = request.data;
  const uid = request.auth?.uid;
  
  await db.runTransaction(async (tx) => {
    const ref = db.collection('lists').doc(listId);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError('not-found', 'List not found');
    if (snap.data().userId !== uid) throw new HttpsError('permission-denied');
    if (snap.data().updatedAt > baseUpdatedAt) throw new HttpsError('aborted', 'Concurrent modification');
    
    const updates = deltas.reduce((acc, d) => {
      Object.entries(d.fields).forEach(([k, v]) => {
        acc[`associations.${d.id}.${k}`] = v;
      });
      return acc;
    }, { updatedAt: FieldValue.serverTimestamp() });
    
    tx.update(ref, updates);
  });
});
```

### F. Configuración (`src/constants/syncConfig.ts` — NUEVO)

```typescript
export const SYNC_CONFIG = {
  periodicIntervalMs: {
    free: 5 * 60 * 1000,      // 5 min
    premium: 2 * 60 * 1000,   // 2 min
  },
  maxDeltasPerBatch: {
    free: 50,
    premium: 200,
  },
  retry: {
    maxAttempts: { free: 2, premium: 3 },
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
  keepaliveMaxBytes: 64 * 1024,     // browser limit
  keepaliveSafeLimit: 50 * 1024,    // 50KB margen de seguridad
  maxConflictRetries: 2,            // Guardia anti-bucle infinito
} as const;
```

### G. Service Wrapper (`src/services/listService.ts`)

```typescript
export const listService = {
  // ...existing...
  
  updateListFields: async (listId: string, baseUpdatedAt: number, deltas: AssociationDelta[]) => {
    return callFunction('updateListFields', { listId, baseUpdatedAt, deltas });
  },
};
```

---

## Flujo de Errores y Reintentos

```
flushSync(listId)
    │
    ├─► Éxito: clear pendingDeltas[listId], lastSyncedAt = now
    │
    └─► Fallo:
        ├─ Network/5xx: retry con exponential backoff (max attempts por tier)
        ├─ 409/aborted (concurrent): 
        │     1. Re-fetch list desde cloud
        │     2. Re-merge local + cloud (preferLocal)
        │     3. Re-compute delta
        │     4. Re-intentar (1 vez)
        └─ 403/404/otros: log error, mantener en pendingDeltas, reintentar en próximo ciclo
```

---

## Offline Persistence (Detalle Punto 4)

**Problema:** Usuario juega offline → cierra pestaña → `keepalive` falla → datos perdidos.

**Solución: Persistir `pendingDeltas` en localStorage + flush al reconectar**

```typescript
// 1. Cargar al iniciar (hydration)
const loadPersistedDeltas = () => {
  const saved = localStorage.getItem('glimmind_pending_deltas');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      Object.entries(parsed).forEach(([listId, deltas]) => {
        pendingDeltas.set(listId, deltas as AssociationDelta[]);
      });
    } catch { /* ignore */ }
  }
};

// 2. Persistir cada cambio
const persistDeltas = () => {
  localStorage.setItem('glimmind_pending_deltas', JSON.stringify(Object.fromEntries(pendingDeltas)));
};

// 3. En flushSync (éxito): limpiar localStorage
const flushSync = async (listId) => {
  try {
    await listService.updateListFields(...);
    pendingDeltas.delete(listId);
    lastSyncedAt.set(listId, Date.now());
    persistDeltas();
  } catch (e) {
    // mantener en localStorage para reintento
  }
};

// 4. Session-end: intentar keepalive con chunking si >50KB, si falla → YA está en localStorage
const KEEPALIVE_SAFE_LIMIT = 50 * 1024; // 50KB (límite navegador 64KB)

function serializeForKeepalive(listId: string, deltas: AssociationDelta[]): string {
  return JSON.stringify({ listId, baseUpdatedAt: getListBaseUpdatedAt(listId), deltas });
}

async function flushListWithChunking(listId: string, options: { keepalive: boolean }) {
  const deltas = pendingDeltas.get(listId) || [];
  const payload = serializeForKeepalive(listId, deltas);
  
  if (payload.length <= KEEPALIVE_SAFE_LIMIT || !options.keepalive) {
    // Payload cabe en un solo request
    await flushSync(listId, options);
    return;
  }
  
  // Chunking: dividir deltas en lotes por prioridad (recientes primero)
  const sortedDeltas = [...deltas].sort((a, b) => b.updatedAt - a.updatedAt);
  const chunks: AssociationDelta[][] = [];
  let currentChunk: AssociationDelta[] = [];
  let currentSize = 0;
  
  for (const delta of sortedDeltas) {
    const deltaSize = JSON.stringify(delta).length;
    if (currentSize + deltaSize > KEEPALIVE_SAFE_LIMIT && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(delta);
    currentSize += deltaSize;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);
  
  // Enviar chunks secuencialmente (keepalive)
  for (const chunk of chunks) {
    await flushSync(listId, { ...options, deltas: chunk });
  }
  
  // Deltas no enviados (si quedan) se quedan en localStorage para próximo load
}

const flushAllPendingSyncs = async ({ keepalive }) => {
  await Promise.allSettled(Array.from(pendingDeltas.keys()).map(listId => 
    flushListWithChunking(listId, { keepalive })
  ));
};

// 5. Al reconectar: reintentar pendientes
useEffect(() => {
  const handleOnline = () => get().pendingDeltas.forEach((_, listId) => get().flushSync(listId));
  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}, []);
```

---

## Conflict Resolution (Punto 3: Last-Write-Wins + Anti-Loop Guard)

**Estrategia:** `last-write-wins` con server timestamp como source of truth + contador de reintentos.

```typescript
// En Cloud Function updateListFields:
if (snap.data().updatedAt > baseUpdatedAt) {
  throw new HttpsError('aborted', 'Concurrent modification');
}

// En cliente (flushSync catch 409):
const MAX_CONFLICT_RETRIES = 2; // Guardia anti-bucle

async function flushSync(listId: string, options: { keepalive?: boolean; deltas?: AssociationDelta[]; baseUpdatedAt?: number; conflictRetryCount?: number } = {}) {
  const retryCount = options.conflictRetryCount ?? 0;
  
  try {
    await listService.updateListFields(
      listId, 
      options.baseUpdatedAt ?? getListBaseUpdatedAt(listId), 
      options.deltas ?? pendingDeltas.get(listId) || []
    );
    pendingDeltas.delete(listId);
    lastSyncedAt.set(listId, Date.now());
    persistDeltas();
  } catch (error) {
    if (error.code === 'aborted' && retryCount < MAX_CONFLICT_RETRIES) {
      // 1. Re-fetch list desde cloud
      const cloudList = await listService.getList(listId);
      // 2. Merge: cloud vence (last-write-wins)
      const localList = getListLocal(listId);
      const merged = mergeCloudWins(localList, cloudList);
      // 3. Re-compute delta vs merged
      const currentLocal = get().lists.find(l => l.id === listId)?.associations || [];
      const newDelta = computeDelta(merged.associations, currentLocal);
      // 4. Re-intentar con contador incrementado
      await flushSync(listId, { 
        ...options, 
        deltas: newDelta, 
        baseUpdatedAt: cloudList.updatedAt,
        conflictRetryCount: retryCount + 1 
      });
      return;
    }
    // Otros errores o max retries: mantener en pendingDeltas
    if (error.code !== 'aborted') persistDeltas(); // No persistir si fue abort tras max retries
  }
}
```

---

## Métricas de Observabilidad

```typescript
interface SyncMetrics {
  sessionEndSyncs: number;
  periodicSyncs: number;
  manualSyncs: number;
  failedSyncs: number;
  conflictsResolved: number;
  avgDeltasPerSync: number;
  avgPayloadBytes: number;
  lastSyncLatencyMs: number;
}
```

Exponer via `gameStore.getState().getSyncMetrics()` para dashboard/admin.

---

## Archivos Afectados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/store/gameStore.ts` | Modificar | Estado + actions de sync pendiente |
| `src/hooks/app/useAppBootstrap.ts` | Modificar | Session-end listeners |
| `src/hooks/game/usePeriodicSync.ts` | **Nuevo** | Hook sync periódico |
| `src/utils/syncDelta.ts` | **Nuevo** | Delta computation |
| `src/constants/syncConfig.ts` | **Nuevo** | Configuración por tier |
| `src/services/listService.ts` | Modificar | Wrapper `updateListFields` |
| `backend/src/functions/lists/updateListFields.ts` | **Nuevo** | Cloud Function partial update |
| `firebase.json` | Modificar | Registrar nuevo endpoint |
| `docs/dashboard-api-trigger-analysis.md` | Modificar | Actualizar tabla de APIs |

---

## Estimación de Costos (1k usuarios activos/día, 50 cards/sesión)

| Métrica | Actual | Optimizado | Ahorro |
|---------|--------|------------|--------|
| Writes/sesión | 50 | 1-2 | **96-98%** |
| Reads/carga (returning) | 3 | 0.3 | **90%** |
| Payload/write | ~5 KB | ~500 B | **90%** |
| Cloud Function calls/sesión | ~10 | 2-3 | **70%** |
| **Costo mensual estimado** | **$5-10** | **$0.50-1.00** | **~90%** |

---

## Tests de Integración (Punto 5)

| Test | Escenario | Verificación |
|------|-----------|--------------|
| `session-end-sync.test.ts` | `beforeunload` + `visibilitychange:hidden` + `pagehide` | `fetch(keepalive:true)` llamado con deltas correctos |
| `periodic-sync.test.ts` | Intervalo 5min, deltas pendientes | `flushSync` llamado solo si hay cambios |
| `offline-persistence.test.ts` | Jugar offline → cerrar → abrir online | Datos sincronizados al reconectar |
| `conflict-resolution.test.ts` | Concurrent edit (cloud + local) | Re-merge + re-sync automático (LWW), **máx 2 reintentos** |
| `delta-computation.test.ts` | Varios cambios en associations | Solo campos modificados en delta |
| `keepalive-chunking.test.ts` | Payload >50KB en session-end | Chunks secuenciales enviados, resto en localStorage |
| `mobile-lifecycle.test.ts` | `pagehide` en iOS Safari mock | Listener dispara flush correctamente |

**Herramientas:** Vitest + MSW (mock Service Worker) para interceptar `callFunction` / `fetch`.

---

## Próximos Pasos (Implementación)

1. Crear `syncConfig.ts` + `syncDelta.ts` (tipos + utilidades)
2. Añadir estado/actions en `gameStore.ts`
3. Implementar `usePeriodicSync.ts` hook
4. Añadir session-end listeners en `useAppBootstrap.ts`
5. Crear Cloud Function `updateListFields` + registrar en `firebase.json`
6. Conectar `listService.updateListFields`
7. Tests de integración: session-end, periodic, conflict resolution, offline
8. Deploy a emulador → load test → producción

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Payload > 64KB en `keepalive` | Chunking automático (50KB chunks), prioridad por `updatedAt` reciente; resto queda en localStorage |
| `beforeunload` no dispara en iOS/Safari | Triple listener: `beforeunload` + `visibilitychange:hidden` + `pagehide` |
| Conflictos concurrentes → bucle infinito | Optimistic concurrency + **contador `conflictRetryCount` (max 2)** + LWW merge |
| Usuario cierra pestaña mid-sync | `keepalive` garantiza entrega; idempotencia en backend |
| Offline prolongado | Persistir `pendingDeltas` en localStorage; flush al reconectar (`online` event) |
| Regression en merge logic | Tests exhaustivos de merge con deltas |

---

## Checklist de Verificación Pre-Deploy

- [ ] `npx tsc --noEmit` sin errores
- [ ] `npx vitest run` todos pasan
- [ ] Tests de `beforeunload` + `visibilitychange` en emulador
- [ ] Load test: 100 usuarios concurrentes, 50 cards c/u
- [ ] Verificar métricas en Cloud Console (writes, reads, function invocations)
- [ ] Documentar en `dashboard-api-trigger-analysis.md`