# AI deck routes have no rate limit

**Resolved:** 2026-10-13. Both handlers are now wrapped with
`applyRateLimit("aiGroup", handler)`. The helper moved from eight local copies
into `utils/rateLimit.js` so new routes import it instead of duplicating it.
Verified with `scripts/repro-p0-ai-rate-limit.sh`: 0 x 429 in a burst of 11 on
both routes before the fix, 1 x 429 out of 11 on each after it.

The per-instance counting weakness this work uncovered is filed separately as
[`../P2/2026-10-13-rate-limit-por-instancia.md`](../P2/2026-10-13-rate-limit-por-instancia.md).

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

## Reproduction

`scripts/repro-p0-ai-rate-limit.sh` fires a burst of 11 at each AI route with a
body that fails validation, so no Gemini call is made and nothing is spent, and
a control burst of 21 at `createList` (20/min). The harness draws no conclusion
unless the control answers 429. The burst is sequential on purpose: the limiter
counts per instance and the emulator runs more than one instance of the same
function, so a concurrent burst is spread across them (see
[`../P2/2026-10-13-rate-limit-por-instancia.md`](../P2/2026-10-13-rate-limit-por-instancia.md)).

Before the fix, 2026-10-13:

```
== 2. Control: createList, limit 20/min
   createList: 21 requests fired sequentially
   20x HTTP 400
   1x HTTP 429
   PASS  control: HTTP 429 past the tier. The mechanism works and the harness is sound.

== 3. createDeckFromText, aiGroup 10/min, burst of 11
   createDeckFromText: 11 requests fired sequentially
   11x HTTP 400

== 4. createYouTubeDeck, aiGroup 10/min, burst of 11
   createYouTubeDeck: 11 requests fired sequentially
   11x HTTP 400

-- Summary --
   control (createList, limited):   1 x 429 out of 21
   createDeckFromText (unlimited):  0 x 429 out of 11
   createYouTubeDeck (unlimited):   0 x 429 out of 11
   FAIL  neither AI route refused a burst of 11 against a 10/min policy. The defect is present.
```

After the fix, same script:

```
== 2. Control: createList, limit 20/min
   createList: 21 requests fired sequentially
   20x HTTP 400
   1x HTTP 429
   PASS  control: HTTP 429 past the tier. The mechanism works and the harness is sound.

== 3. createDeckFromText, aiGroup 10/min, burst of 11
   createDeckFromText: 11 requests fired sequentially
   10x HTTP 400
    1x HTTP 429

== 4. createYouTubeDeck, aiGroup 10/min, burst of 11
   createYouTubeDeck: 11 requests fired sequentially
   10x HTTP 400
    1x HTTP 429

-- Summary --
   control (createList, limited):   1 x 429 out of 21
   createDeckFromText (unlimited):  1 x 429 out of 11
   createYouTubeDeck (unlimited):   1 x 429 out of 11
   PASS  both AI routes refused past 10/min. The rate limit is in place.
```