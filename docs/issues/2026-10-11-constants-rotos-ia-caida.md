# AI deck generation is dead in production

**Date:** 2026-10-11
**Priority:** P0
**Status:** Not fixed

## What

Commit `a4acaa9` ("create feature/stripe-subscriptions branch", 2026-10-08)
deleted 28 lines from `backend/src/functions/src/utils/constants.js` and did not
update the files that import them. Eight exports are now `undefined` at runtime:

```
GLOBAL_AI_DAILY_CAP, VOCABULARY_TARGET_LANGUAGES, VIDEO_MAX_SECONDS,
VOCABULARY_GEMINI_MODELS, VOCABULARY_MAX_OUTPUT_TOKENS,
VOCABULARY_TERMS_THRESHOLD_COMPACT_CONTEXT, MAX_CARDS_PER_AI_REQUEST,
PUBLISH_MIN_CARDS, PUBLISH_MAX_CARDS
```

## Impact

| Broken reference | Effect |
|---|---|
| `vocabularyExtractionService/client.js:57` — `for (const model of VOCABULARY_GEMINI_MODELS)` | `TypeError: undefined is not iterable`. Gemini is never called |
| `vocabularyExtractionService/index.js:68` — `Number(segment.start) <= VIDEO_MAX_SECONDS` | Always `false`, every segment filtered out, returns `{items: []}` |
| `youtubeDeckRoutes.js:149`, `createDeckFromText.js:86` — `globalCalls >= GLOBAL_AI_DAILY_CAP` | Always `false`. The global AI cap blocks nothing |
| `catalogRoutes.js:42` — `cardCount < PUBLISH_MIN_CARDS \|\| cardCount > PUBLISH_MAX_CARDS` | Both `false`. Publishing has no size limit |
| `vocabularyHelpers.js:50` — `VOCABULARY_TARGET_LANGUAGES.includes(...)` | `TypeError` before the extractor is reached |

YouTube and free-text deck generation are broken end to end. Premium has no AI
feature to sell, and it has been this way for three days.

## Evidence

```
$ node -e 'const c=require("./src/utils/constants");
  console.log(c.VOCABULARY_GEMINI_MODELS)'
undefined
```

Restorable from `git show a4acaa9^:backend/src/functions/src/utils/constants.js`
(line 9: `const GLOBAL_AI_DAILY_CAP = 200;`, line 15: the model list).

## Fix

Restore the eight exports and their values to `constants.js`, and their usage to
`module.exports`. Add a test that imports `constants.js` and asserts every symbol
referenced elsewhere in the tree is defined — a missing export is a runtime
`TypeError`, not a type error, so TypeScript and `tsc` cannot catch it.