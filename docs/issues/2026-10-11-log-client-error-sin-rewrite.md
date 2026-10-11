# logClientError has no rewrite, so client errors are lost

**Date:** 2026-10-11
**Priority:** P1
**Status:** Not fixed

## What

`callFunction` builds `/api/logClientError`, but `firebase.json` has no rewrite
for that path. It falls through to the catch-all `** → /index.html`, which
returns the SPA shell as HTML. `logEvent` then calls `JSON.parse` on HTML, throws,
and falls into `queueForRetry`.

The queue it writes to is never drained: `flushEventQueue()` has no call site.

## Impact

Every uncaught client error produces one wasted HTTP request that never reaches
the function, and the error itself is stored in `localStorage` (up to 50 events)
and never sent. There is no production visibility into client-side errors.

It does not cost money — the request is served by Hosting, not the function — but
it silently defeats the error reporting that was built for this purpose.

## Evidence

```
$ grep -c logClientError firebase.json
0

src/services/callFunction.ts:17,43-44   builds '/api/logClientError'
src/services/callFunction.ts:116        queueForRetry -> localStorage (max 50)
src/services/callFunction.ts            flushEventQueue() has no call site
```

## Fix

Add a rewrite next to the other function rewrites:

```json
{ "source": "/api/logClientError", "function": "logClientError" }
```

Then wire `flushEventQueue()` on app start or on `beforeunload` so queued events
actually drain.