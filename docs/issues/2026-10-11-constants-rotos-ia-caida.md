# AI deck generation is dead in production

**Date:** 2026-10-11
**Priority:** P0
**Status:** Fixed on 2026-10-12 — restored in `constants.js`

## What

Commit `a4acaa9` ("create feature/stripe-subscriptions branch", 2026-10-08)
deleted 28 lines from `backend/src/functions/src/utils/constants.js` and did not
update the files that import them. Eleven exports are now `undefined` at runtime:

```
GLOBAL_AI_DAILY_CAP, VOCABULARY_TARGET_LANGUAGES, VIDEO_MAX_SECONDS,
VOCABULARY_GEMINI_MODELS, VOCABULARY_MAX_OUTPUT_TOKENS,
VOCABULARY_TERMS_THRESHOLD_COMPACT_CONTEXT, MAX_CARDS_PER_AI_REQUEST,
PUBLISH_MIN_CARDS, PUBLISH_MAX_CARDS,
YT_AI_DAILY_LIMIT_FREE, YT_AI_DAILY_LIMIT_PREMIUM
```

The last two are imported at `youtubeDeckRoutes.js:17-18` and
`createDeckFromText.js:16-17` and never referenced. They are dead imports with
no runtime effect; remove them or restore them, but they block nothing.

## Impact

| Broken reference | Effect |
|---|---|
| `vocabularyHelpers.js:50` — `VOCABULARY_TARGET_LANGUAGES.includes(...)` | **First failure.** `TypeError: Cannot read properties of undefined (reading 'includes')` |
| `youtubeDeckRoutes.js:115`, `createDeckFromText.js:58` — `isValidTargetLanguage(...)` | Call site of the above. No surrounding `try/catch`, so it escapes the handler |
| `catalogRoutes.js:42` — `cardCount < PUBLISH_MIN_CARDS \|\| cardCount > PUBLISH_MAX_CARDS` | Both `false`. Publishing has no size limit |
| `youtubeDeckRoutes.js:149`, `createDeckFromText.js:86` — `globalCalls >= GLOBAL_AI_DAILY_CAP` | Always `false`. The global AI cap blocks nothing |

Both deck-generation routes therefore return an unhandled `500` before they
reach Gemini. The user sees an opaque server error, not a message about their
input.

Two further defects sit **behind** the language check and are not reachable
until it is fixed:

| Broken reference | Effect |
|---|---|
| `vocabularyExtractionService/index.js:68` — `Number(segment.start) <= VIDEO_MAX_SECONDS` | Always `false`, every segment filtered out, returns `{items: []}` |
| `vocabularyExtractionService/client.js:57` — `for (const model of VOCABULARY_GEMINI_MODELS)` | Would throw `TypeError: undefined is not iterable`, but `index.js` returns before reaching it |

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

Restore the eleven exports and their values to `constants.js`, and their usage to
`module.exports`. Add a test that imports `constants.js` and asserts every symbol
referenced elsewhere in the tree is defined — a missing export is a runtime
`TypeError`, not a type error, so TypeScript and `tsc` cannot catch it.

## Resolution

Done on 2026-10-12. Nine values came from `git show a4acaa9^`. The remaining two,
`PUBLISH_MIN_CARDS` and `PUBLISH_MAX_CARDS`, never existed in that file at all:
commit `7393f35` (2026-09-11) added `catalogRoutes.js` referencing them and never
added the constants, so that part was broken from the day it was written, not a
regression. Their intended values live in `src/constants/publishDeck.ts` (20 and
120) and are confirmed in `docs/plans/2026-09-03-publish-deck-to-catalog.md`.

Verified after restoring:

```
isValidTargetLanguage("es")            -> true      (was: TypeError, HTTP 500)
Number(segment.start) <= 3600          -> true      (was: always false)
globalCalls >= 200                     -> blocks at 200
cards outside 20..120                  -> rejected
extractVocabulary                     -> reaches Gemini
```

`extractVocabulary` was run with a deliberately invalid key and reached the API,
returning `API_KEY_INVALID`. That is the expected result and proves the text is
no longer discarded before the call.

**Still open:** the Gemini model list is `["gemini-3.6-flash", "gemini-3.5-flash",
"gemini-flash-latest"]`, restored verbatim from history. Whether the first two
names still resolve was not tested, because that needs a real API key. If a
deck-generation request comes back with a model error, check this list first.