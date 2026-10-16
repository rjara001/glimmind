# logClientError has no rewrite, so client errors are lost

**Date:** 2026-10-11
**Priority:** P0 (reclassified 2026-10-16: the keepalive incident proved the blindness cost a production incident)
**Status:** Implemented 2026-10-16 — pending deploy verification; see [`docs/plans/2026-10-16-client-error-observability.md`](../../plans/2026-10-16-client-error-observability.md)

## What

`errorReporting.logEvent` sends to `/api/logClientError`, but `firebase.json`
has no rewrite for that path. It falls through to the catch-all
`** → /index.html`, which returns the SPA shell as HTML. `logEvent` then
calls `JSON.parse` on HTML, throws, and falls into `queueForRetry`
(`src/services/errorReporting.ts:116`).

The queue it writes to is never drained: `flushEventQueue()`
(`src/services/errorReporting.ts:193`) has no call site.

On top of that, the six catches in `src/hooks/app/useAppHandlers.ts`
(lines 84, 245, 346, 400, 458, 495) only `showToast(error.message)` and never
call `logEvent`, so even a working pipeline would miss the errors users
actually hit.

## Impact

Every client-only failure is invisible in GCP. Uncaught errors waste one HTTP
request, land in `localStorage` (up to 50 events) and are never sent. Caught
UI errors never leave the browser at all.

## Evidence

```
$ grep -c logClientError firebase.json
0

src/services/errorReporting.ts:109         callFunction('logClientError')
src/services/errorReporting.ts:116         queueForRetry -> localStorage (max 50)
src/services/errorReporting.ts:193         flushEventQueue() has no call site
src/hooks/app/useAppHandlers.ts:346-351    catch shows toast only, no logEvent
```

**Incident 2026-10-16 (why P0):** the `bulkCreateList` "Failed to fetch" bug
(keepalive body over the 64 KiB Fetch-spec cap) was 100% invisible in Cloud
Run/Log Explorer — the fetch died client-side before reaching the network,
`handleBulkCreateLists` swallowed the error into a toast, and the broken
reporting pipeline would have lost it anyway. The bug was only found because
the user reported it manually. No production user incident of this class can
currently be diagnosed without the user describing it.

## Fix

Full plan:
[`docs/plans/2026-10-16-client-error-observability.md`](../../plans/2026-10-16-client-error-observability.md)

1. Add the rewrite `{ "source": "/api/logClientError", "function": "logClientError" }`.
2. Guest guard in `logEvent`/`flushEventQueue` (§31: guests never invoke Cloud Functions).
3. Call `flushEventQueue()` on app start (`src/index.tsx`).
4. Add `logEvent` to the six catches in `useAppHandlers.ts`.
5. Tests: `tests/services/errorReporting.test.ts` + rewrite-presence test.
