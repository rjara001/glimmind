# Plan: Context Optimization + Translation UI in ListEditor

**Date:** 2026-08-26
**Status:** Draft

---

## Objective

1. Optimize the context sent to Google Translate v3 to reduce character consumption by ~65-75%
2. Update the ListEditor table: remove "Traducción" column, add "Contexto" column
3. Display translation quota usage in the ListEditor so users see remaining characters before translating

---

## Problem Analysis

### Current state
- NLP builds 3-sentence context windows (~500-900 chars per term)
- Translation prompt is verbose: `Context: "<context>"\nTranslate only the expression "<term>" into <Lang>:` (~80 chars overhead per term)
- Google Translate v3 charges for the full prompt text (context + overhead + term)
- No visibility into remaining translation quota in the UI
- "Traducción" column in AssociationTable shows `assoc.translation` field (unused by YouTube decks)
- "Contexto" exists on `Association` but is not displayed

### Impact
- A batch of 30 terms with 3-sentence contexts: ~30 × (600 + 80) = ~20,400 chars consumed
- After optimization: ~30 × (200 + 15) = ~6,450 chars consumed (**~68% reduction**)

---

## Changes

### 1. Context Optimization in NLP Pipeline

**File:** `backend/nlp-server/phrase_extractor.py`

Replace `_build_context_windows()` with character-limited version:

```python
def _build_context_windows(doc, window_size: int = 1, max_chars: int = 250) -> Dict[int, str]:
    sents = list(doc.sents)
    windows: Dict[int, str] = {}
    for i, sent in enumerate(sents):
        prev_text = sents[i - 1].text.strip() if i > 0 else ""
        curr_text = sent.text.strip()
        next_text = sents[i + 1].text.strip() if i < len(sents) - 1 else ""
        full = f"{prev_text} {curr_text} {next_text}".strip()
        if len(full) > max_chars:
            full = curr_text if len(curr_text) <= max_chars else curr_text[:max_chars] + "..."
        windows[i] = full
    return windows
```

**Rules:**
- Window: 1 sentence before + current + 1 after (already `window_size=1`)
- Hard limit: 250 characters
- Fallback: if 3 sentences exceed 250 chars, use only the current sentence
- If even the current sentence exceeds 250 chars, truncate with `...`

### 2. Compact Translation Prompt

**File:** `backend/src/functions/src/routes/translateVocabulary.js`

Replace the verbose prompt format in `translateCards()`:

```javascript
// BEFORE (~80 chars overhead):
`Context: "${card.context}"\nTranslate only the expression "${card.term}" into ${langName}:`

// AFTER (~15 chars overhead):
`[${card.context}] ${card.term}`
```

Google Translate infers the translation intent from the bracketed context pattern.

### 3. Character Counting Update

**File:** `backend/src/functions/src/routes/translateVocabulary.js`

Update `incomingCharCount` to count only the term (not the context), since context is now optimized overhead:

```javascript
// BEFORE:
const incomingCharCount = translationCards.reduce((sum, c) => sum + c.term.length + (c.context || "").length, 0);

// AFTER:
const incomingCharCount = translationCards.reduce((sum, c) => sum + c.term.length, 0);
```

**Rationale:** Context is prompt engineering overhead that the user doesn't control. Charging users for context chars would be unfair since it's an internal optimization. The term is the actual content being translated.

### 4. Remove "Traducción" Column

**File:** `src/components/list-editor/AssociationTable.tsx`

- Remove header `<th>Traducción</th>` (lines 110-112)
- Remove cell rendering `assoc.translation` (lines 159-172)
- Update `colSpan` in empty state (line 192): reduce from 5 to 4

### 5. Add "Contexto" Column

**File:** `src/components/list-editor/AssociationTable.tsx`

Add new column after "value2" (definition):

- Header: `Contexto`
- Cell: truncated text (max ~60 chars) with full context on hover via `title` attribute
- Hidden on small screens (`hidden md:table-cell`)
- Read-only (no input, just display text)
- Empty state: show `—` dash

### 6. Translation Quota Display in ListEditor

**File:** `src/components/ListEditor.tsx`

Add a translation quota bar in the toolbar area (near the "Traducir" button), only visible when items are selected:

- Show: `"Traducción: X / Y chars"`
- Progress bar: green (<70%), amber (70-90%), rose (>90%)
- Updates after each translation call using `response.consumedChars` and `response.userRemainingChars`
- Limit derived from user tier: free=20,000, premium=100,000

**File:** `src/types/quota.ts`

Add translation fields to `UserQuota`:

```typescript
export interface UserQuota {
  // existing fields...
  translationCharsUsed: number;
  translationCharLimit: number;
}
```

**File:** `backend/src/functions/src/services/userService.js`

Update `getQuota()` to also read the current month's translation usage doc and include `translationCharsUsed` and `translationCharLimit` in the response.

---

## File Summary

| # | File | Change |
|---|------|--------|
| 1 | `backend/nlp-server/phrase_extractor.py` | `_build_context_windows()` with max_chars=250 |
| 2 | `backend/src/functions/src/routes/translateVocabulary.js` | Compact prompt + count only term chars |
| 3 | `src/components/list-editor/AssociationTable.tsx` | Remove Traducción col, add Contexto col |
| 4 | `src/types/quota.ts` | Add `translationCharsUsed`, `translationCharLimit` |
| 5 | `backend/src/functions/src/services/userService.js` | Include translation usage in `getQuota` |
| 6 | `src/components/ListEditor.tsx` | Translation quota bar + improved toast |

---

## Verification

1. NLP test: send text with long sentences, verify context never exceeds 250 chars
2. Translation test: verify compact prompt produces correct translations
3. UI test: verify "Traducción" column removed, "Contexto" column visible with truncated text
4. Quota test: translate items, verify progress bar updates with remaining chars
5. Build: `npm run build` passes
