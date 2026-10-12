# QuotaExceededError used without being imported

**Date:** 2026-10-11
**Priority:** P1
**Status:** Not fixed

## What

`listRoutes.js` tests `error instanceof QuotaExceededError` three times, but only
imports `requireAuth` from `helpers.js`. The class is never imported into the
module, so the identifier is undefined at call time.

## Impact

When a user hits the card quota, `listService/quota.js` throws
`QuotaExceededError`. The catch block then evaluates
`error instanceof QuotaExceededError`, which raises
`ReferenceError: QuotaExceededError is not defined`. The intended friendly message
("Llegaste a tu límite de N tarjetas…") never reaches the client; the request
fails with an unhandled error instead.

Affects `createList`, `updateList` and `splitList` — the paths that block a user
who has run out of quota, which is exactly when the message matters.

## Evidence

```
src/routes/listRoutes.js:3    const { requireAuth } = require("../utils/helpers");
src/routes/listRoutes.js:75   if (error instanceof QuotaExceededError) {
src/routes/listRoutes.js:95   if (error instanceof QuotaExceededError) {
src/routes/listRoutes.js:164  if (error instanceof QuotaExceededError) {

utils/helpers.js:1            class QuotaExceededError extends Error {
utils/helpers.js:119          QuotaExceededError,     // exported, just never imported
```

## Fix

Add `QuotaExceededError` to the existing destructure on line 3. It is already
exported from `helpers.js`; no other change is needed.