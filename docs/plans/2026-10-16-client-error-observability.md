# Client error observability: rewrite, queue drain, and catch reporting

**Date:** 2026-10-16
**Status:** Implemented 2026-10-16 — pending post-deploy verification (§ Post-deploy verification)
**Issue:** [`docs/issues/P0/2026-10-11-log-client-error-sin-rewrite.md`](../issues/P0/2026-10-11-log-client-error-sin-rewrite.md)

## Problem

There is zero production visibility into client-side errors. Three verified
defects chain up to total blindness:

1. **`/api/logClientError` has no hosting rewrite.** `firebase.json` lists 36
   rewrites and none targets this path, so the request falls through to the
   catch-all `** → /index.html`. The SPA shell (HTML) comes back,
   `JSON.parse` throws in `logEvent` (`src/services/errorReporting.ts:114`),
   and the event is parked in `localStorage` (capped at 50).
   `flushEventQueue()` (`src/services/errorReporting.ts:193`) has no call
   site, so it never drains.
2. **UI catches swallow errors.** All six catches in
   `src/hooks/app/useAppHandlers.ts` (lines 84, 245, 346, 400, 458, 495) only
   `showToast(error.message)`; none calls `logEvent`.
3. **The keepalive incident proved it.** The `bulkCreateList` "Failed to
   fetch" bug (2026-10-16) never reached GCP logs: the fetch died client-side
   before the network, and the catching handler reported nothing. It was only
   discovered because the user reported it manually.

## Impact

Every client-only failure — pre-flight fetch rejections, store logic errors,
rendering crashes — is invisible in Log Explorer. Support is "ask the user".
The open P1 from 2026-10-11 documented the broken pipeline; the incident above
demonstrated the cost.

## Plan

### 1. Missing rewrite (`firebase.json`)

```json
{ "source": "/api/logClientError", "function": "logClientError" }
```

Next to the other function rewrites, before the `**` catch-all. The function
already exists and is deployed
(`backend/src/functions/src/routes/loggingRoutes.js:19`, exported through
`loadRoutes` in `backend/src/functions/index.js`).

### 2. Guest guard in `logEvent` (`src/services/errorReporting.ts`)

AGENTS.md §31: guests must never invoke Cloud Functions. Today there is no
guard. Import `auth` from `../firebase` and `GUEST_UID` from
`../constants/app`; if `auth.currentUser?.uid === GUEST_UID`, `logEvent`
logs a warning and returns (no `callFunction`, no queueing).
`flushEventQueue()` gets the same guard.

### 3. Drain the retry queue (`src/index.tsx`)

Call `void flushEventQueue();` next to `installGlobalEventHandlers()` (line
8). With the guest guard, guests never trigger the remote flush.

### 4. Report the swallowed catches (`src/hooks/app/useAppHandlers.ts`)

Add fire-and-forget `void logEvent(...)` (toast UX unchanged) to the six
catches:

| Catch (approx. line) | Handler | eventType |
|---|---|---|
| 84 | `handleSyncFromCloud` | `sync.error` |
| 245 | `handleCreateList` | `list.create_error` |
| 346 | `handleBulkCreateLists` | `import.bulk_create_error` |
| 400 | `handleUpdateList` | `list.update_error` |
| 458 | `handleDeleteList` | `list.delete_error` |
| 495 | `handleCreateMultipleLists` | `list.split_error` |

Pattern per catch:

```ts
void logEvent('import.bulk_create_error', {
  message: error instanceof Error ? error.message : String(error),
  error,
  labels: { source: 'useAppHandlers', action: 'handleBulkCreateLists' },
});
```

Side effect: the guest guard also resolves
`docs/issues/P2/2026-10-13-settingsmodal-log-sin-guard-guest.md` → move it to
`done/` when this ships.

## Tests

New `tests/services/errorReporting.test.ts` (mock `@/firebase` and
`@/services/callFunction`):

- Guest → `logEvent` neither calls `callFunction` nor queues.
- Authenticated user → `logEvent` calls `callFunction('logClientError', ...)`.
- `callFunction` rejects → event queued in `localStorage` (capped at 50).
- `flushEventQueue` drains the queue and clears `localStorage`; no-op for
  guests.

New `tests/config/firebaseRewrites.test.ts`: parse `firebase.json` and assert
the `/api/logClientError` rewrite exists (locks the regression that started
this).

## Changelog (§33)

`useAppHandlers.ts` is a §33 file → add a row to
`docs/dashboard-api-trigger-analysis.md`.

## Post-deploy verification

1. `curl -s -X POST https://glimmind.com/api/logClientError -H 'Content-Type: application/json' -d '{"severity":"INFO","payload":{"message":"rewrite probe"}}'`
   → must answer `{"success":true}` (today it returns the SPA HTML shell).
2. Log Explorer: `resource.type="cloud_function" resource.labels.function_name="logClientError" textPayload:"[Client Event]"`
   → the probe must appear.
3. E2E: provoke a network error in the app → a `[Client Event]` with
   `severity: ERROR` must appear in Log Explorer.

## Decision pending (owner)

A Cloud Monitoring log-based metric + email alert on `[Client Event]`
severity=ERROR would turn "check the logs" into "get notified". No monitoring
IaC exists in the repo; needs gcloud/console. Not included until decided.

## Release

Patch bump; deploy with
`npm run build && firebase deploy --only hosting,functions`.

## Risks

- Log volume: only the six catches plus the global handlers feed it; volume is
  low. The existing `WeakSet` dedup (`src/services/errorReporting.ts:41`)
  prevents double reporting.
- Toast latency: `logEvent` is fire-and-forget and does not block the catch.
