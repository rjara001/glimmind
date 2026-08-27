# Context Window for Vocabulary Cards — Implementation Plan

**Date:** 2026-08-26
**Status:** Proposed
**Scope:** Extend the vocabulary card data structure to carry a 3-sentence context window, and use it to improve translation quality via Google Cloud Translation v3's contextual translation feature.

---

## 1. Goal

Currently, each vocabulary card carries a single `context` field containing the sentence where the term was found. The goal is to:

1. **Expand `context`** from a single sentence to a **3-sentence window** (previous + current + next) so the translator has more semantic context.
2. **Use context in translation** by sending a structured prompt to Google Cloud Translation v3 that asks for translation of the specific term within its context, producing more accurate translations.
3. **Preserve backward compatibility** — the `context` field remains optional; existing cards without it continue to work.

---

## 2. Current State

### Data Flow

```
NLP Pipeline (Python)
  └─ phrase_extractor.py  → PhraseCandidate { text, category, frequency, context, start, score }
  └─ vocabulary_ranker.py → Dict { term, type, frequency, context, start, score }
  └─ main.py              → VocabularyItem (Pydantic) { term, type, frequency, context, start, score }

Cloud Function (Node.js)
  └─ translateVocabulary.js → receives flat texts[], returns translations[]

Frontend (TypeScript)
  └─ VocabularyItem { term, type, frequency, context, start, score }
  └─ Association { id, term, definition, translation?, ... }   ← NO context field
  └─ TranslationRequest { texts: string[] }                     ← NO context sent
  └─ TranslationItem { original, translated }                   ← NO context in response
```

### Key Gap

`context` is **produced** by the NLP pipeline and **received** by the frontend as `VocabularyItem.context`, but it is:

- **NOT displayed** in VocabularyPreview (the second column is empty)
- **NOT stored** on Association cards (no `context` field on the type)
- **NOT sent** to the translation service (only flat `texts[]`)
- **NOT used** for contextual translation

---

## 3. Proposed Changes

### Phase 1: NLP Pipeline — 3-Sentence Context Window

**File:** `backend/nlp-server/phrase_extractor.py`

Currently, `context` is set to `token.sent.text.strip()` — the single sentence where the term appears. Change this to include the sentence before and after.

**Changes:**

1. In `extract_phrases_from_doc()`, after building the `sentences` list, build a mapping of sentence index → 3-sentence window.
2. When assigning `candidate.context`, use the window instead of just the current sentence.
3. Make the window size configurable via the request parameter `context_window` (default: 1 = one sentence on each side).

```python
# New helper
def _build_context_windows(doc, window_size: int = 1) -> Dict[int, str]:
    sents = list(doc.sents)
    windows = {}
    for i, sent in enumerate(sents):
        start = max(0, i - window_size)
        end = min(len(sents), i + window_size + 1)
        windows[i] = " ".join(s.text.strip() for s in sents[start:end])
    return windows
```

3. In each extractor, instead of `token.sent.text.strip()`, pass the sentence index and look up the window:

```python
# Before
context=token.sent.text.strip()

# After
context=sent_windows.get(token.sent.start, token.sent.text.strip())
```

4. Add `context_window: int = 1` to `VocabularyRequest` in `main.py` and pass it through.

**File:** `backend/nlp-server/main.py`

- Add `context_window: int = 1` to `VocabularyRequest`
- Pass `context_window` to `extract_phrases_from_doc()` and `extract_words_from_doc()`

### Phase 2: Data Model — Add `context` to Association

**File:** `src/types.ts`

```typescript
export interface Association {
  id: string;
  term: string;
  definition: string;
  translation?: string;
  context?: string;           // ← NEW: 3-sentence context window
  currentCycle: number;
  status: 'pending' | 'correct';
  isLearned: boolean;
  isArchived: boolean;
  hits?: number;
  misses?: number;
  timesPlayed?: number;
  lastPlayedAt?: number;
  createdAt?: number;
  updatedAt?: number;
}
```

**Retrocompatibility:** The field is optional (`context?: string`). Existing cards without it continue to work. No migration needed.

### Phase 3: Preview — Display Context

**File:** `src/components/modals/VocabularyPreview.tsx`

In `handleAccept`, carry `item.context` into the Association:

```typescript
const associations: Association[] = result.items.map((item) => ({
  id: crypto.randomUUID(),
  term: item.term,
  definition: '',
  context: item.context || '',   // ← carry context
  currentCycle: 1,
  status: 'pending' as const,
  isLearned: false,
  isArchived: false,
}));
```

Optionally display context in the preview table as a tooltip or a third column.

### Phase 4: Translation Service — Contextual Translation

#### 4a. Frontend — Send context with translation request

**File:** `src/types/translation.ts`

```typescript
export interface TranslationCard {
  term: string;
  context?: string;
}

export interface TranslationRequest {
  cards: TranslationCard[];       // ← replaces flat texts[]
  targetLang?: string;
  sourceLang?: string;
}
```

**File:** `src/services/translationService.ts`

```typescript
async translateBatch(
  userId: string,
  cards: TranslationCard[],
  targetLang = 'es',
  sourceLang = 'en'
): Promise<TranslationResponse>
```

**File:** `src/components/ListEditor.tsx` — `handleTranslateSelected`

```typescript
const cards = selectedAssociations.map(a => ({
  term: a.term,
  context: a.context,
}));
const response = await translationService.translateBatch(user.uid, cards, translateLang);
```

#### 4b. Backend — Build contextual prompts

**File:** `backend/src/functions/src/routes/translateVocabulary.js`

Change `translateTexts()` to accept `TranslationCard[]` and build structured prompts:

```javascript
async function translateTexts(cards, targetLang, sourceLang = "en") {
  const texts = cards.map(card => {
    const ctx = card.context || card.example || "";
    if (ctx) {
      return `Context: "${ctx}"\nTranslate only the expression "${card.term}" into ${targetLang}:`;
    }
    return card.term;
  });

  const response = await sendAuthenticatedRequest(
    GOOGLE_TRANSLATE_URL,
    {
      contents: texts,
      mimeType: "text/plain",
      targetLanguageCode: targetLang,
      sourceLanguageCode: sourceLang,
    },
    60000
  );

  if (!response.translations || response.translations.length !== cards.length) {
    throw new Error("Invalid translation response.");
  }

  return response.translations.map((t) => t.translatedText);
}
```

**Key change:** The `contents` array now contains structured prompts instead of raw terms. Google Cloud Translation v3 supports this — it translates the full content but the prompt structure tells the model what to focus on.

#### 4c. Backend — Response shape

The response remains the same structure:

```javascript
res.json({
  translations: cards.map((card, idx) => ({
    original: card.term,
    translated: translations[idx] || card.term,
  })),
  consumedChars: incomingCharCount,
  userRemainingChars,
  quotaExceeded: false,
});
```

#### 4d. ListEditor — Apply translation result

`handleTranslateSelected` applies the translation to `definition` (existing behavior) and optionally to `translation` field:

```typescript
const updatedAssociations = editList.associations.map(a => {
  if (!selectedIds.has(a.id)) return a;
  const translation = response.translations.find(t => t.original === a.term);
  return {
    ...a,
    definition: translation ? translation.translated : a.definition,
  };
});
```

---

## 4. Backward Compatibility

| Layer | Compatibility |
|-------|--------------|
| NLP API response | `context` field already exists, no change needed |
| `VocabularyItem` TypeScript type | Already has `context: string` |
| `Association` type | `context?: string` — optional, existing cards unaffected |
| Translation request | New `cards` shape, but backend accepts both `texts[]` and `cards[]` during transition |
| Cloud Translation API | Structured prompts are fully supported by v3 |
| Existing cards | No migration — `context` is `undefined` for old cards |

---

## 5. Files to Modify

| File | Change |
|------|--------|
| `backend/nlp-server/phrase_extractor.py` | 3-sentence context window, configurable window size |
| `backend/nlp-server/main.py` | Add `context_window` parameter, pass to extractors |
| `src/types.ts` | Add `context?: string` to `Association` |
| `src/types/translation.ts` | Add `TranslationCard` interface, update request type |
| `src/services/translationService.ts` | Send `cards[]` instead of `texts[]` |
| `src/components/ListEditor.tsx` | Build `cards` with context for translation |
| `src/components/modals/VocabularyPreview.tsx` | Carry `context` into Association, display in table |
| `backend/src/functions/src/routes/translateVocabulary.js` | Build contextual prompts, accept `cards[]` |

---

## 6. Implementation Order

| Step | Task | Effort |
|------|------|--------|
| 1 | Update `Association` type with `context?: string` | 10 min |
| 2 | Update NLP pipeline for 3-sentence context window | 1 hour |
| 3 | Update VocabularyPreview to carry + display context | 30 min |
| 4 | Update translation types and service | 30 min |
| 5 | Update Cloud Function to build contextual prompts | 30 min |
| 6 | Update ListEditor to send cards with context | 20 min |
| 7 | Test end-to-end | 30 min |

**Total estimated effort:** ~3 hours

---

## 7. Success Criteria

1. VocabularyPreview shows 3-sentence context for each term
2. Association cards store `context` after creation
3. Translation request sends context alongside terms
4. Translations are more accurate (contextual disambiguation)
5. Existing cards without context continue to work without errors
6. No breaking changes to existing API contracts

---

## 8. Risks

| Risk | Mitigation |
|------|-----------|
| Google Translation v3 prompt format may not work as expected | Test with sample prompts first; fallback to flat translation if needed |
| Context window increases payload size | Window of 1 sentence each side is ~100-200 chars; negligible |
| Existing cards break | `context` is optional; all new code guards with `?.` or `\|\|` |
| Translation cost increase (longer texts) | Prompt overhead is ~50 chars per card; minimal impact on char count |
