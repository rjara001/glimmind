# DeepL API Free Migration — Translation Provider

**Date:** 2026-08-26
**Status:** Implemented

## Context

Google Translate v3 does NOT support a native `context` parameter. The previous workaround (`[context] term` as input text) caused Google to translate the entire string, corrupting the output — the user would see context text mixed with the actual term translation.

DeepL API Free provides a native `context` parameter that:
- Influences translation quality (disambiguation)
- Is NOT billed (characters in `context` are free)
- Supports batch requests (up to 128 texts per call, 128KiB limit)

## Decision: Batch Translation

All selected terms are sent in a **single DeepL API call** rather than one request per term.

| Approach | Requests | Latency | Billing | Context |
|----------|----------|---------|---------|---------|
| 1 request per term | N | N × ~1-2s | term chars only | native per term |
| **Batch (all terms)** | **1** | **~1-2s** | **term chars only** | **shared across batch** |

DeepL's batch approach is superior:
- 1 HTTP request instead of 30+ → dramatically faster
- Same billing (context chars are free, term chars are billed)
- Context is shared but DeepL's neural model handles disambiguation well

## Architecture

```
Frontend (ListEditor)
  → selects terms with checkboxes
  → sends cards[] with { term, context } per card
  → POST /translateVocabulary

Cloud Function (translateVocabulary.js)
  → normalizeCards() validates input
  → quota check (global + user)
  → translateCards()
      → try translateWithDeepL() [PRIMARY]
          → POST https://api-free.deepl.com/v2/translate
          → Auth: DeepL-Auth-Key header
          → body: { text: terms[], context: concatenated, source_lang, target_lang }
          → returns translatedTerms[]
      → on failure: translateWithGoogle() [FALLBACK]
          → Google Translate v3 (existing implementation)
  → persistTranslationQuotaUsage()
  → return { translations, consumedChars, userRemainingChars }
```

## Files Changed

### Created
- `backend/src/functions/src/services/deeplService.js` — DeepL API Free client
  - `translateWithDeepL(cards, targetLang, sourceLang)` → string[]
  - Auth via `Authorization: DeepL-Auth-Key <key>` header
  - Batch: all terms in one `text[]` array
  - Context: concatenated `card.context` strings into single `context` param
  - Language codes: uppercased (`es` → `ES`)
  - Timeout: 30s via `AbortSignal.timeout()`
  - Returns `null` if `DEEPL_API_KEY` not configured (graceful skip)

### Modified
- `backend/src/functions/src/routes/translateVocabulary.js`
  - `translateCards()` now tries DeepL first, falls back to Google
  - Google Translate no longer uses `[context] term` format — sends plain terms
  - Added `translateWithGoogle()` as separate function (previously inline)

- `backend/src/functions/src/utils/constants.js`
  - Added `DEEPL_FREE_URL = "https://api-free.deepl.com/v2/translate"`
  - Added to module exports

## DeepL API Specifics

| Property | Value |
|----------|-------|
| Endpoint | `https://api-free.deepl.com/v2/translate` |
| Auth | `Authorization: DeepL-Auth-Key {API_KEY}` header |
| Content-Type | `application/json` |
| Max texts per request | 128 |
| Max request size | 128KiB |
| Context billing | Free (not counted) |
| Language codes | UPPERCASE (`ES`, `FR`, `DE`, `PT`) |
| Free tier limit | 500K chars/month |

## Environment Variable

```
DEEPL_API_KEY=<your-deepl-api-free-key>
```

Set via Firebase secret:
```bash
firebase functions:secrets:set DEEPL_API_KEY
```

For local emulator, set in `.env` or export before `firebase emulators:start`.

## Fallback Behavior

If DeepL fails (API error, rate limit, timeout, missing API key), the system falls back to Google Translate v3 automatically. Google fallback sends plain terms without the `[context]` prefix — context is lost but translation still works.

## No Frontend Changes

The API contract remains identical: `{ userId, cards, targetLang, sourceLang }` → `{ translations, consumedChars, userRemainingChars }`. Frontend sends `cards[]` with `term` and `context` — the backend handles provider selection transparently.
