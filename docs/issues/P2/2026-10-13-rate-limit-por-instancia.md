# The rate limiter counts per function instance, so every tier undercounts

## What

`utils/rateLimit.js` keeps its counters in a module-level `Map`. Each function
instance has its own `Map`, so the ceiling that is actually enforced is
`tier requests x instances`, not the number written in `RATE_LIMITS`. The
emulator runs more than one instance of the same function, and production
scales the same way.

## Impact

- The policy reads `aiGroup: 10/min`; a burst is spread across instances and
  each one starts its own count. Measured on the emulator: 25 concurrent
  requests against `createList` (20/min) all answered HTTP 400 with
  `X-RateLimit-Remaining: 19`, and the responses carried two different
  `X-RateLimit-Reset` values, i.e. two instances each still on their first
  request.
- Applies to every route, not only the AI ones. For `aiGroup` this is the
  difference between 10 Gemini calls per minute and 10 per instance per minute.
- Sequential requests do accumulate, because they land on one instance, so the
  weakness only shows under concurrency, which is exactly the case the tiers
  exist for.

## Evidence

```
backend/src/functions/src/utils/rateLimit.js:19   const memoryStore = new Map();
backend/src/functions/src/utils/rateLimit.js:26   const key = `${identifier}:${Math.floor(now / limitConfig.windowMs)}`;
```

```
$ # 25 concurrent requests, tier createList = 20/min
   25x HTTP 400        # no 429 anywhere
$ # the same 25 requests, one at a time
   20x HTTP 400  5x HTTP 429
```

A second, smaller defect in the same file: on a refusal the limiter answers 429
and returns without calling `next`, so the promise inside `applyRateLimit`
never settles. The response is already sent, so behaviour is correct and the
pending promise is only garbage.

## Fix

Move the counters into Firestore, which `rateLimit.js` already depends on
through `getDb`, so all instances read one figure. Or keep the in-memory map
and document that each tier is per instance. The second option is cheaper and
honest; which one applies is a product decision and belongs in
[`../../BUSINESS_MODEL.md`](../../BUSINESS_MODEL.md).
