# No per-user cost instrumentation

**Date:** 2026-10-11
**Priority:** P2
**Status:** Not fixed

## What

Nothing records what a user actually consumes on the metered APIs. Quota usage is
tracked in Firestore for enforcement — `ytAiUsedToday` for AI decks,
character counts for translation, character and second counts for voice — but:

- **AI deck cost is never measured.** `GLOBAL_AI_DAILY_CAP` increments a call
  counter, not tokens. No `usageMetadata` from Gemini is persisted, so the cost
  per deck is an estimate, not a measurement.
- **No cost dashboard per user.** `AdminUsageView` shows usage against limits,
  not money.
- **The production `usage_stats` collection is empty**, because everything has
  been tested against the emulator.

## Impact

The plan limits in `config/plans.json` are guesses. The arithmetic in
[`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md) §5 depends on a per-deck cost of
$0.008-0.04 that was inferred from token estimates, not observed. Without
measurements the limits cannot be tuned — they can only be guessed again after the
next pricing change.

This is the gap that makes every other number in the business model provisional.

## Evidence

```
services/vocabularyExtractionService/client.js   response.usageMetadata is not read or stored
routes/youtubeDeckRoutes.js:246                  usage/global.aiCalls + 1  (calls, not tokens)
routes/createDeckFromText.js:154                 same
services/translationQuota.js                     counts characters, no cost
services/chirpTtsService/quota.js                counts characters, no cost
services/sttService/quota.js                     counts seconds, no cost
```

## Fix

Log and persist `usageMetadata.promptTokenCount` / `candidatesTokenCount` per AI
request against the user id, and tag translation/voice/transcription usage with a
cost rate. Then `AdminUsageView` can show cost per user, and the limits in
`plans.json` can be set from observed data instead of estimates.