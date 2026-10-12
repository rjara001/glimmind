# AI deck routes have no rate limit

## What

The only two functions that spend money per call — `createYouTubeDeck` and
`createDeckFromText` — are the only metered routes with no rate limiting
wrapper. Every other route goes through `applyRateLimit`. A rate-limit tier for
exactly this purpose, `aiGroup` (10 requests/minute), is defined in
`rateLimit.js` and referenced nowhere in the codebase.

## Impact

- Both routes are the most expensive thing the app does: a Gemini call per
  request, `timeoutSeconds: 300`, `memory: "512MiB"`.
- Per minute a single account can open as many concurrent generations as the
  platform allows, bounded only by the daily point quota (which is itself
  bypassable — see `2026-10-12-cuotas-no-atomicas.md`).
- 10 concurrent Massive requests = 10 × 512 MiB of function memory.
- `aiGroup` exists at 10/min and would fit the intended policy; nothing
  references it.

## Evidence

```
$ grep -c applyRateLimit backend/src/functions/src/routes/*.js
  youtubeDeckRoutes.js:0
  createDeckFromText.js:0
  listRoutes.js:7
  ttsRoutes.js:2
  activityRoutes.js:4
  progressRoutes.js:2
  settingsRoutes.js:2
  stripeRoutes.js:1
  userRoutes.js:1

backend/src/functions/src/routes/youtubeDeckRoutes.js:82
  exports.createYouTubeDeck = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 300, memory: "512MiB" }, async (req, res) => {

backend/src/functions/src/routes/createDeckFromText.js:24
  exports.createDeckFromText = onRequest({ cors: true, secrets: ["GEMINI_API_KEY"],
    timeoutSeconds: 300, memory: "512MiB" }, async (req, res) => {

backend/src/functions/src/utils/rateLimit.js:5
  aiGroup: { requests: 10, windowMs: 60000 },   // defined, zero references

$ grep -rn "aiGroup" backend/src/functions/src/
  utils/rateLimit.js:5   (definition only)
```

## Fix

Wrap both handlers with `applyRateLimit("aiGroup", handler)`. The tier already
exists.