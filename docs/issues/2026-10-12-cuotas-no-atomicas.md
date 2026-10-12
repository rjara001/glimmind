# Metered quotas are checked and then written, never reserved

## What

Every metered quota — AI decks, cloud TTS, cloud STT, translation — follows the
same read-check-call-write sequence. The usage figure is read, the limit is
compared, the paid API is called, and only afterwards is the new usage written
back with a plain `set`/`batch`. No transaction, no reservation. Concurrent
requests from the same user all read the same starting figure, all pass the
check, and all consume. Blind writes also lose increments: the last writer wins.

## Impact

- A user with 100 free AI points remaining and 20 simultaneous requests is
  allowed 20 Massive decks (100 points each) instead of 1. The realised ceiling
  is `quota × concurrency`, not `quota`.
- Same for the other three meters. TTS free limit is 5000 chars/month; N
  simultaneous calls each pass the check against the same 0.
- Increment loss makes enforcement drift *downward*: a burst of concurrent
  writes records fewer points than were actually spent, so the quota never
  appears exhausted.
- The per-user cap is the vulnerable part. The global caps
  (`CHIRP_TTS_GLOBAL_LIMIT` 500000, `TRANSLATION_GLOBAL_MONTHLY_CHARS` 400000,
  `GLOBAL_AI_DAILY_CAP`) are single counters with the same weakness.

## Evidence

```
backend/src/functions/src/routes/createDeckFromText.js:67   const metaSnap = await metaRef.get();
backend/src/functions/src/routes/createDeckFromText.js:75   if (tier.costPercent > quotaInfo.remainingPoints)  // check
backend/src/functions/src/routes/createDeckFromText.js:90+  // Gemini call, tens of seconds
backend/src/functions/src/routes/createDeckFromText.js:149  const newUsedToday = usedToday + tier.costPercent;
backend/src/functions/src/routes/createDeckFromText.js:151  await metaRef.set({ ytAiUsedToday: newUsedToday, ... }, { merge: true })

same shape in youtubeDeckRoutes.js:130,138,250

backend/src/functions/src/services/chirpTtsService/quota.js
  fetchTtsQuotaDocuments()          // read both counters
  assertUserTtsQuotaHasCapacity()   // compare
  persistTtsQuotaUsage()            // db.batch() + merge, no transaction

backend/src/functions/src/services/translationQuota.js   same three phases
backend/src/functions/src/services/sttService/quota.js   same three phases
```

## Fix

Reserve before spending: run the increment inside `db.runTransaction()` against
the counter document before the API call, and refund the reservation in a
`catch` when the call fails. Apply the same change to all four meters.