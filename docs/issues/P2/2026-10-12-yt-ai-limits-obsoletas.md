# `YT_AI_DAILY_LIMIT_*` contradicts `plans.json` and has no callers

## What

`utils/constants.js` exports `YT_AI_DAILY_LIMIT_FREE` and
`YT_AI_DAILY_LIMIT_PREMIUM`. Nothing reads them. The AI routes have always
resolved the limit through `QuotaService.getAiDailyLimit(tier)`, which reads
`config/plans.json`.

The free values happen to agree. The premium value does not: the constant says
200, `plans.json` says 1000.

## Impact

The constant is a trap rather than a bug: it looks authoritative, it is
exported from the central constants module, and anyone who reaches for it
instead of `getAiDailyLimit` ships a premium allowance five times smaller than
the product's, with no test to catch it — `plansDrift.test.ts` only compares the
two `plans.json` mirrors, and these constants are in neither.

It was already dead before the 2026-10-12 quota work; that change only removed
the last two unused imports of it.

## Evidence

```
utils/constants.js:27   const YT_AI_DAILY_LIMIT_FREE = 100;
utils/constants.js:28   const YT_AI_DAILY_LIMIT_PREMIUM = 200;

config/plans.json       "aiDailyLimit": { "free": 100, "premium": 1000 }

$ grep -rn "YT_AI_DAILY_LIMIT" backend/src/functions/src src
utils/constants.js:27,28,79,80     # definition and re-export only

services/aiDeckQuota.js:63   QuotaService.getAiDailyLimit(tierData && tierData.tier)   # the real source
```

## Fix

Delete both constants and their export entry from `utils/constants.js`. If a
limit needs to be readable outside the plan config, add it to `config/plans.json`
and read it through `quotaConfig.js`, so the drift test covers it.