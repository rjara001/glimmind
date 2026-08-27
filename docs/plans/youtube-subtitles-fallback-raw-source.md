# Plan: Subtitle Unavailable Fallback + Raw Source Text Persistence

## Summary

Add a friendly fallback when YouTube subtitle extraction fails (bot wall / no captions), letting users paste a transcript manually, plus persist the original source text (`rawSourceText`), `sourceType`, and `sourceUrl` for **both** auto and manual flows.

Decisions confirmed with the user:
- Persistence happens on the **frontend `createList`** (confirm-then-save), consistent with the existing architecture.
- The manual `/from-text` endpoint behaves **like the auto flow**: it returns generated vocabulary for the user to confirm first (does NOT persist directly).

Context: the existing "deck" model is `AssociationList` (Firestore `lists` collection). The backend `createYouTubeDeck` returns a `VocabularyResult` to the frontend, and the list is only created via `createList` after the user confirms in the `VocabularyPreview` modal. We extend this model rather than introduce a new `Deck` type.

---

## 1. Types (frontend)

**`src/types/youtube-deck.ts`**
- Extend `VocabularyResult`:
  - `source: 'youtube-transcript' | 'youtube_manual_transcript' | 'raw_text'`
  - add `rawSourceText?: string`, `sourceUrl?: string`
- Add `DeckSourceType = 'youtube_auto' | 'youtube_manual_transcript' | 'raw_text'`
- Add `FromTextConfig extends YouTubeDeckConfig { videoUrl?: string }`
- Add a `SubtitleUnavailableError`-shaped type (code/message/fallbackAvailable) for frontend error detection.

**`src/types.ts`**
- Extend `AssociationList` with optional: `sourceType?: DeckSourceType`, `sourceUrl?: string`, `rawSourceText?: string` (import `DeckSourceType` from `youtube-deck`).

## 2. Backend — `createYouTubeDeck` auto flow

**`backend/src/functions/src/routes/youtubeDeckRoutes.js`**
- After transcript success, build raw plain-text concatenation:
  `const rawSourceText = transcriptResult.segments.map((s) => s.text).join(' ');`
- Include in `responseBody`: `rawSourceText`, `sourceType: 'youtube_auto'`, `sourceUrl: url`.
- Replace the anti-bot (`503`) and no-captions/other-languages responses with the structured fallback payload:
  ```
  { error: "SUBTITLES_UNAVAILABLE", code, message, fallbackAvailable: true }
  ```
  - `code: "503_LOGIN_REQUIRED"` for bot wall
  - `code: "NO_CAPTIONS"` for no subtitles
  - `code: "OTHER_LANGUAGES"` for only non-English captions (English-only limitation)
- Bump `NLP_CACHE_VERSION` → 4 to invalidate stale cached results.

## 3. Backend — new manual endpoint `createDeckFromText`

**`backend/src/functions/src/routes/createDeckFromText.js`** (new file, following `youtubeDeckRoutes.js` conventions)
- `onRequest({ cors, secrets: ["GEMINI_API_KEY"], timeoutSeconds: 300, memory: "512MiB" })`.
- Auth via `verifyIdToken`.
- Validate `{ text, videoUrl?, targetLanguage, level, maxTerms }`; `text` required non-empty; validate target language/level/maxTerms-tier.
- Same quota + global-cap checks as auto flow.
- Convert raw text into a pseudo-segment for Gemini: `const segments = [{ text, start: 0, duration: 0 }];`
- Call `extractVocabulary({ apiKey, segments, maxTerms, targetLanguage, level })`.
- Resolve `sourceType`: `videoUrl` present → `'youtube_manual_transcript'`, else `'raw_text'`.
- Respond with the same `VocabularyResult` shape as auto, plus `rawSourceText: text`, `sourceUrl: videoUrl`, `source`, and `video` info (extract id from `videoUrl` when present).
- Reuse shared helpers (see below) rather than duplicating quota/error-mapping logic.

## 4. Backend — shared helpers (optional but recommended)

Extract small shared helpers from `youtubeDeckRoutes.js` into e.g. `backend/src/functions/src/utils/vocabularyHelpers.js`:
- `extractVideoId`, `resolveTier`, `buildQuotaInfo`, the Gemini error-mapping block.
- Keep it minimal and scoped to avoid unrelated refactors.

## 5. Frontend service

**`src/services/youtubeDeckService.ts`**
- Add `createDeckFromText(text, config: FromTextConfig): Promise<VocabularyResult>` → `callFunction('createDeckFromText', { text, ...config })`.

## 6. Frontend — error detection

**`src/services/callFunction.ts`**
- Currently discards structured error fields. Extend the non-OK branch to attach `code`, `message`, and `fallbackAvailable` to the thrown `Error` (typed helper, no `any`).

## 7. Frontend — `CreateYouTubeDeckModal.tsx`

- Add state: `showFallback`, `manualTranscript`, `isSubmittingFallback`.
- In `handleSubmit` catch: if error indicates subtitles unavailable, show the fallback UI instead of a raw error.
- Fallback UI:
  - Link to `https://youtubetranscript.com/` (target `_blank`, rel noopener).
  - `<textarea>` bound to `manualTranscript`.
  - Button "Generar Baraja desde Transcripción" → `createDeckFromText(manualTranscript, { videoUrl: url, maxTerms: effectiveMaxTerms, targetLanguage, level })`, then `loadQuota()` and `onSuccess(result)`.
  - Loading state per AGENTS.md loading pattern.
- `onSuccess` unchanged (VocabularyResult now carries source metadata).

## 8. Frontend — `VocabularyPreview.tsx`
- Route source metadata to the parent by changing `onAccept` to also carry `rawSourceText`/`sourceType`/`sourceUrl` (e.g. `onAccept(associations, sourceMeta)`), so App.tsx can attach it to the temp list.

## 9. Frontend — `App.tsx` orchestration
- Capture `rawSourceText`/`sourceType`/`sourceUrl` from the accepted `VocabularyResult`.
- Store them alongside `pendingYouTubeAssociations` (extend pending state).
- When building the temp `AssociationList` (App.tsx ~83-99), set `sourceType`, `sourceUrl`, `rawSourceText`.

## 10. Persistence — `createList` / sync
- **`src/services/firestoreService.ts`** `createList`: pass through `sourceType`, `sourceUrl`, `rawSourceText`.
- **`backend/src/functions/src/routes/listRoutes.js`** `createList`: accept and forward these fields.
- **`backend/src/functions/src/services/listService/crud.js`** `buildListDocumentData`: include `sourceType`, `sourceUrl`, `rawSourceText` when provided. `applyUpdatesToListAndAdjustCardCounters` passes through via `...updates` automatically. Also include in `divideOriginalListIntoGroupsAndReplaceIt` group docs.
- **`backend/src/functions/src/services/listService/index.js`**: ensure `persistNewListWithAssociations` forwards the new keys.
- **`src/store/gameStore.ts` `syncToCloud`**: verify it sends the whole `AssociationList` so the new fields persist on the null→create path.

## 11. Version bump (AGENTS.md rule 29)
- Bump minor: `src/constants/version.ts` and `package.json` → `1.9.0` (new feature).

---

## Verification
- Run backend emulators (`npm run emulators`) and exercise both flows manually against emulators.
- Typecheck frontend and backend lint if available.
- Confirm Firestore `lists` docs contain `sourceType`/`rawSourceText`/`sourceUrl` for a YouTube-auto deck and a manual-transcript/raw-text deck.

## Notes
- `extractVocabulary` derives `start` timestamps from segments; for raw text the `start` is `0`, which is acceptable.
- `cleanTranscript`/`buildTimestampedLines` work on the single pseudo-segment for raw text.
