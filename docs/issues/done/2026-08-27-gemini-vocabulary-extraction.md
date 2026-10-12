# Gemini Vocabulary Extraction — Replace Python NLP Backend (v2)

**Date:** 2026-08-27
**Status:** Implemented
**Areas:** Firebase Functions (youtube vocabulary deck), NLP pipeline, Gemini AI, Frontend UI

## Problem

YouTube vocabulary deck extraction currently depends on a **separate Python NLP service** (`backend/nlp-server/`): a FastAPI app that runs spaCy, YAKE, and (as a fallback) yt-dlp + faster-whisper to produce terms, phrases, classifications, and rankings. This adds a second deployable/venv/Docker surface plus heavyweight dependencies whose only job is natural-language analysis that a hosted LLM handles better.

The decision: **remove all Python** and let **Gemini 1.5 Flash** (official `@google/genai` SDK) perform, in a single call:

- Natural-language term/phrase selection from the transcript (filtered by user target level/preferences).
- Contextual classification (difficulty, category tags).
- Structuring into the existing `VocabularyItem` contract.
- Translation of each term to the user-selected target language (replacing DeepL/Google Translate for new decks).

## Key Product & UX Decisions (New Repercussions)

### Interactive pre-extraction configuration

Before processing a video, the user configures:

1. **Deck size / terms count**

   | Tier | Terms | Badge | Daily limit impact |
   |---|---|---|---|
   | Express | ~20 | 🟢 Verde | Bajo (≈15% límite diario) |
   | Standard | ~40 | 🟡 Amarillo | Medio (≈30% límite diario) |
   | Extended | ~80 | 🟠 Naranja | Alto (≈60% límite diario) |
   | Massive | ~150 | 🔴 Rojo Oscuro | Máximo (100% límite diario) |

2. **Target language**: dynamic selection (Spanish, German, French, Portuguese, etc.).
3. **Focus profile**: B1 Intermediate vs. B2-C1 Advanced (idioms, phrasal verbs, collocations).

### Usage quota control (percentage-based)

- Replaces rigid extraction counts with a **quota percentage tracker** in the UI (% of daily AI capacity used).
- If a selected deck size exceeds the remaining daily allowance (e.g. attempting a 🔴 Massive deck with 20% quota remaining), the button **disables** and the user is prompted to select a lower tier.
- **Model:** dedicated per-user percentage tracker for YouTube extraction (`meta.ytAiUsedToday`, 0–100 points). The existing `aiGroup` integer counter (3/10) is left untouched to avoid mixing counts and percentages.
- **Capacity by tier:** free = 100 points/day (1 Massive deck), premium = 200 points/day (2 Massive decks). The larger-budget option is shown but disabled for free users. Tier costs are fixed points (15/30/60/100).
- **Cache hits consume 0% quota.**
- Global safety cap `usage/global.aiCalls` (200) is incremented by 1 per Gemini generation.

### 1-hour video cap (truncation)

- Node.js/TypeScript silently filters transcript segments to a maximum timestamp of **3,600 seconds (1 hour)**.
- If truncated, the backend returns `wasTruncated: true` so the UI can show an informative badge **without throwing an error**.

### Large deck optimization (Massive tier)

- To prevent JSON truncation within Gemini's **8,192 output-token limit** when requesting 100–150 terms, the prompt automatically instructs Gemini to keep context strings **compact (≤12 words)**.

## Decisions & Architecture Updates

- **Gemini model chain:** `gemini-1.5-flash` (primary) → `gemini-2.5-flash` → `gemini-2.5-flash-lite` → `gemini-2.0-flash`, with retries + jitter (reuses existing `aiService` pattern).
- **Translation:** produced inline by Gemini into the requested `targetLanguage`.
- **No-transcript handling:** friendly 422 **("El vídeo no tiene subtítulos disponibles")** when `youtube-transcript` finds no captions. Whisper/Python STT fallback is completely removed.
- **Cache management:** keep `youtubeVocabularyCache` in Firestore, bump `NLP_CACHE_VERSION` to 3 (invalidates Python-era cached decks). Cache key includes the extraction config so decks are cached per `videoId + language + maxTerms + targetLanguage + level`. Cached requests consume 0% daily quota.

## Solution

### Architecture before

```
createYouTubeDeck (Cloud Function)
  └─ youtube-transcript ──▶ segments
  └─ http://localhost:8001/extract-vocabulary (Python FastAPI)
        ├─ text_normalizer.py (contractions, [Music] artifacts)
        ├─ phrase_extractor.py (spaCy NER, idioms, n-grams)
        ├─ vocabulary_ranker.py (scores, tiers, overlap dedup)
        └─ stt_fallback.py (yt-dlp + faster-whisper)
```

### Architecture after

```
createYouTubeDeck (Cloud Function)
  └─ youtube-transcript ──▶ filter (<= 3600s)
  └─ vocabularyExtractionService (TypeScript)
        ├─ normalizers.js (artifacts cleanup, frequency recalc, overlap dedup)
        ├─ prompt.js (dynamic template: size, targetLanguage, level, context brevity)
        └─ client.js (@google/genai, JSON schema, retries/fallback chain)
        └─ index.js (orchestrator -> normalized VocabularyResult)
```

### New backend services (`backend/src/functions/src/services/vocabularyExtractionService/`)

| File | Responsibility |
|---|---|
| `client.js` | `GoogleGenAI` instance using `GEMINI_API_KEY`. Executes `generateContent` with `responseMimeType: "application/json"`, retry mechanism, and model fallbacks. |
| `prompt.js` | Dynamic prompt builder accepting `maxTerms`, `targetLanguage`, `level`, and `compactContext` flag based on requested deck size (≥100 terms → ≤12-word contexts). |
| `normalizers.js` | Migrated TypeScript guardrails: transcript cleanup, exact term frequency recalculation, and phrase/substring overlap deduplication. |
| `index.js` | Main orchestrator: truncates transcript at 1 hr → applies guardrails → builds prompt → invokes Gemini → validates JSON response. |

### Route & quota changes (`backend/src/functions/src/routes/youtubeDeckRoutes.js`)

- **Quota pre-check:** computes cost percentage of the request based on the selected deck size against the user's remaining daily capacity (`meta.ytAiUsedToday`; free limit 100, premium 200).
- **Secrets & config:** add `secrets: ["GEMINI_API_KEY"]` (`timeoutSeconds: 300`, `memory: 512MiB`).
- **Cache bump:** `NLP_CACHE_VERSION = 3`, keyed by extraction config.
- **Remove Python service config:** delete `NLP_SERVICE_URL`, `callPythonService`, and Whisper branches.
- **Input validation:** `maxTerms ∈ {20, 40, 80, 150}`, `targetLanguage` in allowed list, `level ∈ {b1, b2c1}`.
- Persist `ytAiUsedToday += tierCost` and `usage/global.aiCalls += 1` after a successful generation.

### Quota wiring (free/premium)

- `backend/src/functions/src/utils/helpers.js` — `metaDefaults`/`getOrCreateMeta` gain `ytAiUsedToday: 0`, `ytAiDateKey`.
- `backend/src/functions/src/services/userService.js` — `getQuota` returns `ytAiUsedToday` and `ytAiDailyLimit` (100 free / 200 premium).
- `backend/src/functions/src/utils/constants.js` — add `DECK_TIERS`, `YT_AI_DAILY_LIMIT_FREE`/`PREMIUM`, `VIDEO_MAX_SECONDS = 3600`, `VOCABULARY_GEMINI_MODELS`, `VOCABULARY_MAX_OUTPUT_TOKENS`, `VOCABULARY_TARGET_LANGUAGES`.

### Frontend changes

- `src/components/modals/CreateYouTubeDeckModal.tsx` — config wizard (deck-size tier cards with color badges + % cost, target-language selector, B1/B2-C1 focus toggle, quota % bar, disabled CTA when remaining quota < tier cost).
- `src/components/modals/VocabularyPreview.tsx` — show `item.translation` in the value2 column; show a "video truncated to 1h" badge for `wasTruncated`; map translation into `association.translation`.
- `src/services/youtubeDeckService.ts` — `createVocabularyDeck(url, { maxTerms, targetLanguage, level })`.
- `src/types/youtube-deck.ts` — `source` narrows to `'youtube-transcript'`; `VocabularyItem` gains `translation?: string`; `VocabularyResult` gains `wasTruncated?: boolean` and `quota?: { usedTodayPercent, remainingPercent }`.
- `src/types/quota.ts` — `UserQuota` gains `ytAiUsedToday`, `ytAiDailyLimit`.

### Guardrails migration (Python → TypeScript)

**Kept:**
- **Transcript cleanup:** removes `[Music]`, `[Applause]`, HTML tags, collapsed whitespace, and consecutive duplicate words.
- **Deterministic frequency:** exact term frequencies recalculated post-hoc (instead of trusting LLM counts).
- **Overlap deduplication:** multi-word phrases take precedence over substring single words (`_is_overlap`).
- **Firestore cache:** updated to version 3.

**Dropped:**
- spaCy NER/heuristics, heavy Python NLP dependencies, and local Whisper/yt-dlp STT fallback.

## Behavior comparison

| Scenario | Before (Python) | After (Gemini + TS) |
|---|---|---|
| Video with captions | Transcripts processed via Python spaCy. | Transcripts (max 1h) processed by Gemini 1.5 Flash in 1 unified call. |
| Video > 1 hour | Processed completely or timed out. | Truncated to first 60 minutes with `wasTruncated: true` indicator. |
| Video without captions | Downloaded audio + Whisper STT. | Friendly 422: **"El vídeo no tiene subtítulos disponibles"**. |
| Translations | Separate DeepL/Google API call (Spanish only). | Inline translation by Gemini into any requested `targetLanguage`. |
| Quota / UI | Fixed extraction count per day. | Visual percentage bar (🟢 Verde to 🔴 Rojo Oscuro) linked to deck size. |
| Cache | `youtubeVocabularyCache` v2. | `youtubeVocabularyCache` v3 (0% quota cost on cache hits). |

## Out of scope

- Migrating the existing `aiService` (grouping/aiRoutes) to `@google/genai` — it stays on the raw REST client to limit blast radius.
- Browser/Vosk/Chirp STT for the **voice study mode** — unrelated to video transcription, untouched.
- DeepL flow for existing lists — unchanged.
- Async/queue processing of long videos — still synchronous with 300s timeout.

## Environment

- Local emulator: add `GEMINI_API_KEY=<key>` to `backend/src/functions/.env` (same mechanism as `DEEPL_API_KEY`). Production: `firebase functions:secrets:set GEMINI_API_KEY`.

## Verification plan

1. `npx tsc --noEmit` — verify frontend and contract type safety.
2. `npm test` — run existing unit/integration tests.
3. Emulator testing (`npm run emulators`):
   - Process a captioned video with **Express / Green** setting → fast response, translation output.
   - Process a captioned video with **Massive (150 terms) / Dark Red** setting → full valid JSON parsing without output truncation.
   - Process a video **> 60 mins** → output contains `wasTruncated: true`.
   - Process an **uncaptioned** video → friendly 422 status.
   - Repeat same video (+ same config) → served from cache with **0 quota decrement**.
4. Repo scan to verify complete removal of `backend/nlp-server`, spaCy, FastAPI, and yt-dlp references.
5. Bump version to **1.8.0** in `src/constants/version.ts` and root `package.json`.

## Open items

- `gemini-1.5-flash` ~8k output tokens may still strain 150 items + translations even with compact contexts; if truncation appears during emulator testing, normalization accepts the valid JSON subset and the prompt caps `maxTerms` conservatively.