# `updateListFields` responde 400 Invalid request body en cada carga

## What

Every app load, `loadInitialData` → `syncToCloud` → `flushSync` calls
`/api/updateListFields` with a pending-delta payload that fails zod validation,
so the function answers `400 {"error":"Invalid request body"}`. `flushAllPendingSyncs`
retries the same payload immediately and fails again. Observed for lists
`DP7Kq34SswgVSlaggQKw` and `cMSbAk0KKuCfQkxhuqV5` on glimmind.com (2026-10-13).

The client never surfaces the zod `details.fieldErrors`, so the failing field is
invisible: the log only shows `Error: Invalid request body`.

## Impact

- The pending deltas for those lists are never acknowledged, so they stay in
  `pendingDeltas` and are re-sent on every load and every `flushAllPendingSyncs`.
- Local card progress can diverge from the cloud copy with no user-visible error.
- Two wasted Cloud Function invocations per load per affected list.

## Evidence

- Client call: `src/services/firestoreService.ts:56-61` → `listService.updateListFields`
- Chunked send: `src/store/gameStore.ts:1149-1157`
- 400 source: `backend/src/functions/src/routes/listRoutes.js:22-33` (`runValidation`)
- Schema: `backend/src/functions/src/utils/validation.js:63-79` — the strict fields
  are `currentCycle` (`int().min(1)`), `updatedAt` (`int().min(0)`), `id` (`min(1)`)
  and `deltas` (`.max(500)`). A float `updatedAt`, `currentCycle: 0`, an empty `id`
  or more than 500 deltas all produce this exact 400.
- Same lists also log `[flattenList] ignoring non-array associations`, so the
  stored list document may be malformed and feed bad deltas.

Related but distinct: `docs/issues/backlog/2026-08-11-voice-study-mode-diagnostics.md`
records a `syncToCloud` 404 that should call `createList` instead of `updateList`.

## Fix

Log `details.fieldErrors` from the 400 response next to the list id before
clearing/keeping the deltas, then normalise the offending field on the client
(round `updatedAt` to an integer, clamp `currentCycle` to `>= 1`, drop deltas
with an empty `id`) so a single malformed delta cannot wedge the sync loop.
