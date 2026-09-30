# Improve Local Language Candidate Extraction in Dashboard "Add Deck" Flow

**Date:** 2026-09-29
**Status:** Proposed
**Scope:** Improve the existing local text-extraction implementation in the Dashboard "Crear Lista Personalizada" flow.

---

## 1. Goal

Improve the existing text extraction functionality so it can identify **useful vocabulary and English expressions** from unstructured text, especially song lyrics, articles, paragraphs, and notes.

The goal is **not simply to extract statistically frequent keywords**.

The extractor should identify candidates that are useful for building a language-learning deck, including:

* Relevant single words
* Multi-word expressions
* Phrasal expressions
* Collocations
* Idiomatic expressions
* Less common or potentially useful vocabulary

**Primary use case:** English vocabulary extraction from English source text. Spanish text support is maintained in the engine but not the primary focus.

### Example

**Input:**
```text
The coming of age
Pretends you are looking back on
...
On the spur of the moment
...
beauty is only skin deep
```

**Expected candidates:**
```text
coming of age
looking back
bygone
limelight
wink of an eye
flashback
seraphic
glorify
prime
lore
elder
spur of the moment
skin deep
```

**Should avoid trivial words:**
```text
the
you
are
we
is
of
in
```

---

## 2. Important Change From Previous Plan

The previous plan was based primarily on TF-IDF extraction.

The improved plan treats TF-IDF as the **existing extraction mechanism**, not as the final definition of what a useful language-learning candidate is.

The implementation should therefore be improved incrementally:

```text
Existing implementation
        │
        ▼
Audit current behavior
        │
        ▼
Improve candidate generation
        │
        ▼
Hard filters (trivial words, stopwords at boundaries)
        │
        ▼
Scoring (TF-IDF + phrase quality heuristics)
        │
        ▼
Deduplication
        │
        ▼
Vocabulary filtering
        │
        ▼
Language-learning candidates
```

**Do not** replace the current implementation with YAKE or KeyBERT before evaluating the existing implementation against real examples.

---

## 3. Current Implementation Audit

Before modifying the extractor, inspect the existing implementation and verify what is actually present.

### Files Found

| File | Purpose |
|------|---------|
| `src/services/localKeywordExtraction.ts` | Main extraction service (TF-IDF + n-grams) |
| `src/services/localKeywordExtraction.test.ts` | Unit tests |
| `src/types/keyword-extraction.ts` | Type definitions |
| `src/hooks/dashboard/useDeckImporter.ts` | Hook managing extraction state |
| `src/components/views/dashboard/BulkImportPanel.tsx` | UI for "Extraer" tab |

### Current Behavior Verified

1. **Local extraction already implemented** ✓ — Runs in browser via `extractKeywordsLocal()`
2. **Algorithm** — TF-IDF with n-grams (1–3 words), not YAKE/KeyBERT
3. **Runs in browser** ✓ — Synchronous, no network calls
4. **Candidate types** — Only `'word' | 'phrase'` (no expression/collocation)
5. **Scoring** — Pure TF-IDF (tf × idf)
6. **Stopwords** — Removed during tokenization, breaking multi-word phrases containing stopwords
7. **N-grams** — 1–3 words only (plan wants 4 words)
8. **Deduplication** — Subset-based (removes shorter if longer exists)
9. **Deck integration** ✓ — Selected candidates become `Association` objects with context

---

## 4. Target Data Model

Expand the current model minimally. Do not add fields that require semantic understanding we don't yet have.

```typescript
export interface ExtractedCandidate {
  term: string;
  score: number;
  frequency: number;
  type: 'word' | 'phrase';
  context: string;
  alreadyInVocabulary?: boolean;
}
```

**Removed from previous version:**
- `confidence` — no real probabilistic basis in TF-IDF + heuristics
- `start`/`end` — not needed for MVP if context is preserved; add later for highlighting
- `collocation`/`expression` types — no classifier exists yet; use `'phrase'` for all multi-word

The exact fields should be adapted to the existing codebase rather than duplicating existing types.

---

## 5. Extraction Pipeline

```text
Raw text
   │
   ▼
Sentence segmentation
   │
   ▼
Tokenization (keep stopwords for phrase generation)
   │
   ├───────────────┐
   ▼               ▼
Single words     N-grams (2–4 words)
   │               │
   │          All n-grams from token stream
   │               │
   └───────┬───────┘
           ▼
     Hard filters
     (length, stopword boundaries, trivial words)
           │
           ▼
     Candidate scoring
     (TF-IDF + phrase quality heuristics)
           │
           ▼
     Ranking & deduplication
           │
           ▼
     Vocabulary filtering
           │
           ▼
    Final candidates
```

---

## 6. Candidate Generation

### 6.1 Single Words

Generate candidate words after:
* Lowercasing
* Punctuation removal
* Normalization (NFD + accent removal)
* Stopword filtering
* Minimum length filtering (≥ 3)

**Example:**
```text
bygone
seraphic
glorify
lore
elder
```

### 6.2 Multi-word Phrases

Generate n-grams on the **full token stream including stopwords**, initially:
```text
2 words
3 words
4 words
```

**Increase from 3 to 4 words** because expressions such as:
```text
spur of the moment
wink of an eye
coming of age
```
require four tokens.

**Stopwords must NOT break phrases.** Tokenization for n-grams keeps stopwords; filtering happens after generation via hard filters.

---

## 7. Hard Filters (Before Scoring)

These are **filters**, not penalties. Candidates failing these are discarded entirely.

| Filter | Rule | Examples Rejected |
|--------|------|-------------------|
| **Min length** | Term length ≥ 3 chars | `a`, `to`, `of` |
| **Trivial words** | Single-word stopwords | `the`, `you`, `are`, `is`, `we` |
| **Leading stopword** | Reject if first token is stopword | `of the moment`, `in the end` |
| **Trailing stopword** | Reject if last token is stopword (with exceptions) | `looking back on` → *evaluate case by case* |
| **All stopwords** | Reject if all tokens are stopwords | `of the`, `in a` |
| **Min content words** | Require ≥ 1 non-stopword token | — |

**Trailing stopword exception:** Some valid phrases end with prepositions/particles (`look up`, `give up`, `come back`). Do not hard-filter these. Instead, score them lower if needed.

### Mandatory Test Cases (must pass)

These specific expressions **must** appear in output when present in input:

```text
coming of age
spur of the moment
skin deep
wink of an eye
looking back
```

---

## 8. Candidate Scoring

**Do not implement a weighted scoring formula until baseline outputs have been inspected.**

### Stage 1: Baseline (current implementation)
- TF-IDF only
- Run against 5–10 representative texts
- Document: false positives, missing useful words, missing phrases, duplicates

### Stage 2: Heuristics (additive signals, not a formula)
Keep TF-IDF as the primary signal. Add independent heuristic boosts:

| Signal | Description | Implementation |
|--------|-------------|----------------|
| **Phrase frequency** | Repeated phrases get boost | `+0.1 * (frequency - 1)` |
| **Word rarity** | Less common words get boost | Inverse document frequency across user corpus (if available) or corpus frequency list |
| **Phrase length** | Prefer 3–4 word meaningful sequences | Small boost for length 3–4 vs 2 |
| **Content word density** | Higher ratio of non-stopwords | `contentWords / totalTokens` |

### Stage 3: Ranking & Deduplication
1. Sort by combined score (TF-IDF + heuristics)
2. Deduplicate overlapping: prefer longer meaningful phrase over substrings
   - Keep `spur of the moment`, drop `spur`, `spur of`, `spur of the`

### Stage 4: Vocabulary Filtering (post-ranking)
- Exclude by default (configurable)
- Or mark `alreadyInVocabulary: true` for UI display

---

## 9. Vocabulary Awareness

The extractor compares candidates against the user's existing vocabulary.

**Source:** All `term` fields from `Association` objects across all user's lists in `gameStore`.

**Comparison rules:**
- Case-insensitive
- Accent-insensitive (normalize both sides)
- Exact string match on normalized form
- No stemming/lemmatization in MVP (future enhancement)

**Examples:**
| Existing in vocab | Candidate | Match? |
|-------------------|-----------|--------|
| `looking back` | `Looking Back` | ✅ Yes |
| `look` | `looking` | ❌ No (no stemming) |
| `beauty` | `beauty` | ✅ Yes |
| `skin deep` | `skin deep` | ✅ Yes |

**Default behavior:** Exclude matches from candidate list. Configurable via option to mark instead.

---

## 10. Candidate Categories (MVP)

Only two types for MVP:

```text
WORD      — single token (no spaces)
PHRASE    — 2+ tokens (includes expressions, collocations, idioms)
```

**UI labels:**
```
WORD
  bygone
  seraphic
  glorify
  lore

PHRASE
  looking back
  coming of age
  spur of the moment
  skin deep
  wink of an eye
```

**Do not classify** `idiom`, `phrasal_verb`, `collocation`, `expression` yet — no reliable classifier exists without NLP model. Add later if heuristics prove insufficient.

---

## 11. Local vs GCP Architecture

**First implementation remains local** if performance is acceptable.

```text
Dashboard
   │
   ▼
Local extractor (TF-IDF + heuristics)
   │
   ▼
Candidates
```

No external API calls.

**Future evaluation (only if local quality insufficient):**
- YAKE (lightweight, local or server)
- KeyBERT / semantic extraction — evaluate separately; decide architecture (browser vs GCP) based on model size, latency, cost

Do not pre-commit to GCP or `@xenova/transformers`.

---

## 12. Algorithm Evaluation

Before choosing YAKE or KeyBERT, create a small evaluation set with real examples.

### Minimum Test Cases

1. English song lyrics
2. English article
3. English paragraph
4. Spanish text (secondary)
5. Short text (< 100 words)
6. Text containing idiomatic expressions

### Quality Metric (Manual Precision)

For each test text, inspect **top 20 candidates** and count:

```
Precision = Relevant candidates / 20
```

| Algorithm | Test 1 | Test 2 | Test 3 | Test 4 | Test 5 | Test 6 | Avg Precision |
|-----------|--------|--------|--------|--------|--------|--------|---------------|
| Current TF-IDF | | | | | | | |
| Improved TF-IDF | | | | | | | |
| YAKE | | | | | | | |
| KeyBERT | | | | | | | |

**Target:** Improved TF-IDF ≥ 70% average precision on English texts.

No scientific evaluation framework needed — manual inspection of top 20 is sufficient for comparison.

---

## 13. UI Improvements

Keep the existing "Extraer" tab.

**Rename concept** from:
```text
Keywords
```
to:
```text
Vocabulario y expresiones
```

### Mockup

```text
┌──────────────────────────────────────────────────────────────┐
│ Pegar   Subir archivo   🔍 Extraer vocabulario              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ [ Textarea                                                   │
│   Paste lyrics, article, notes...                            │
│ ]                                                            │
│                                                              │
│                 [Analizar texto]                             │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Nuevas palabras y expresiones                                │
│                                                              │
│ ☑ coming of age       PHRASE                                 │
│ ☑ bygone              WORD                                   │
│ ☑ limelight           WORD                                   │
│ ☑ wink of an eye      PHRASE                                 │
│ ☑ spur of the moment  PHRASE                                 │
│ ☐ time                WORD       Already in vocabulary       │
│                                                              │
│ [Seleccionar todo] [Limpiar]                                │
│                                                              │
│             [Crear Mazo con 5 candidatos]                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 14. Context Preservation

Every candidate retains its original context sentence.

**Example:**
```text
Term:        spur of the moment
Context:     On the spur of the moment
```

Used later for:
* Flashcards
* Translation
* Examples
* AI-assisted definitions
* Reviewing where the word was found

---

## 15. Deck Integration

Keep the existing association format.

For each selected candidate:
```typescript
{
  term: candidate.term,
  definition: '',
  context: candidate.context,
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  metadata: {
    difficulty: 'intermediate',
    frequencyRank: 0,
    tags: ['auto-extracted']
  }
}
```

**The extractor should NOT generate definitions automatically** at this stage. The definition/translation step remains separate.

---

## 16. Implementation Steps

### Step 1 — Audit
- [ ] Locate current extraction implementation
- [ ] Identify all existing extraction-related files
- [ ] Verify current algorithm
- [ ] Verify current UI integration
- [ ] Verify current deck integration
- [ ] Run existing extractor against real text

### Step 2 — Establish Baseline
- [ ] Save current output for 5–10 representative texts
- [ ] Identify false positives
- [ ] Identify missing useful words
- [ ] Identify missing phrases
- [ ] Identify duplicate/overlapping candidates

### Step 3 — Improve Candidate Generation
- [ ] Preserve existing tokenizer/stopwords where useful
- [ ] Support 1–4 word candidates (increase `maxPhraseLength` to 4)
- [ ] Generate n-grams on full token stream (keep stopwords)
- [ ] Add hard filters (trivial words, leading stopword, min content words)
- [ ] Preserve original context

### Step 4 — Improve Scoring
- [ ] Keep TF-IDF as primary signal
- [ ] Add phrase frequency boost
- [ ] Add content word density signal
- [ ] Add phrase length preference (3–4 words)
- [ ] Implement deduplication (prefer longer meaningful phrases)

### Step 5 — Vocabulary Filtering
- [ ] Retrieve existing user vocabulary from `gameStore` lists
- [ ] Normalize terms (lowercase, remove accents) for comparison
- [ ] Case-insensitive, accent-insensitive exact match
- [ ] Exclude matches by default (configurable)
- [ ] Mark `alreadyInVocabulary` for UI if not excluded

### Step 6 — UI
- [ ] Improve candidate display
- [ ] Display candidate type (WORD/PHRASE only)
- [ ] Display context
- [ ] Display existing-vocabulary status
- [ ] Keep manual selection
- [ ] Keep select-all/clear actions
- [ ] Rename "Extraer Keywords" → "Extraer vocabulario"

### Step 7 — Integration
- [ ] Convert selected candidates into associations
- [ ] Create deck
- [ ] Preserve context
- [ ] Verify existing deck creation flow remains unchanged

### Step 8 — Evaluate YAKE (Only if Needed)
- [ ] Add YAKE as experimental implementation
- [ ] Compare output against baseline (manual precision on test set)
- [ ] Measure performance
- [ ] Decide if improvement justifies dependency

### Step 9 — Regression Testing
- [ ] English text
- [ ] Spanish text
- [ ] Lyrics
- [ ] Short text
- [ ] Long text
- [ ] Text with punctuation
- [ ] Text with repeated phrases
- [ ] Text containing known vocabulary
- [ ] Text containing idioms
- [ ] **Mandatory:** `coming of age`, `spur of the moment`, `skin deep`, `wink of an eye`, `looking back` detected when present

---

## 17. Success Criteria

| Criterion | Target |
|-----------|--------|
| **Expressions detected** | `coming of age`, `spur of the moment`, `skin deep`, `wink of an eye`, `looking back` identified without AI API |
| **Noise** | Trivial words (`the`, `you`, `are`, `is`, `we`) filtered out, not just penalized |
| **Existing vocabulary** | Known vocabulary excluded by default, not repeatedly suggested |
| **Context** | Every selected candidate retains source sentence |
| **Performance** | Local extraction < 500ms for typical text (interactive Dashboard) |
| **Precision** | ≥ 70% manual precision on top 20 for English test texts |
| **Extensibility** | Extraction layer can later support YAKE/KeyBERT without rewriting UI or deck-creation flow |

---

## 18. Future Enhancements

* [ ] YAKE extractor
* [ ] KeyBERT/semantic extraction (evaluate architecture separately)
* [ ] Lemmatization (remember/remembered/remembering → remember)
* [ ] Phrasal verb detection
* [ ] Idiom detection
* [ ] Collocation detection
* [ ] CEFR classification
* [ ] Difficulty estimation
* [ ] Automatic translation
* [ ] AI-assisted candidate validation
* [ ] Candidate frequency data from corpus
* [ ] Source text preservation
* [ ] User feedback ("useful"/"not useful") to improve ranking

These remain outside initial implementation unless testing demonstrates necessity.

---

## 19. Versioning

Follow `AGENTS.md` requirement for feature versioning.

If implementation constitutes a new Dashboard feature/change:
- [ ] Increment minor version
- [ ] Keep `src/constants/version.ts` and `package.json` synchronized
- [ ] Verify both values before deployment

```bash
grep APP_VERSION src/constants/version.ts
grep '"version"' package.json
```

Never deploy without required version bump.

---

## 20. Files to Modify

| File | Changes |
|------|---------|
| `src/services/localKeywordExtraction.ts` | Core extraction logic improvements |
| `src/types/keyword-extraction.ts` | Updated type definitions |
| `src/hooks/dashboard/useDeckImporter.ts` | Vocabulary filtering integration |
| `src/components/views/dashboard/BulkImportPanel.tsx` | UI improvements |
| `src/services/localKeywordExtraction.test.ts` | Updated tests (including mandatory phrase tests) |
| `src/constants/version.ts` | Version bump |
| `package.json` | Version bump |

---

## 21. Dependencies

No new dependencies required for initial implementation (local TF-IDF + heuristics).

Future evaluations (separate decisions):
* `yake` (if YAKE evaluation passes)
* Semantic extraction — evaluate model/architecture separately

---

## 22. Related Documents

* `docs/plans/2026-08-26-nlp-vocabulary-improvements.md` — Python NLP pipeline improvements (backend)
* `docs/issues/2026-08-27-gemini-vocabulary-extraction.md` — YouTube vocabulary extraction via Gemini (cloud)
* `docs/dashboard-api-trigger-analysis.md` — API trigger documentation (must be updated per AGENTS.md rule 33)