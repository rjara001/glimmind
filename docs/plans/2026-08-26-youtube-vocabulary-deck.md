# YouTube Vocabulary Deck — Implementation Plan

**Date:** 2026-08-26
**Status:** In Progress
**Scope:** New feature: generate vocabulary flashcards from YouTube video transcripts

---

## 1. Goal

Allow users to paste a YouTube URL and automatically generate a vocabulary flashcard deck from the video's transcript. The extraction must prioritize useful phrases and expressions over isolated words, using deterministic local NLP instead of LLMs or cloud AI services.

---

## 2. Scope & Restrictions

### Allowed
- Deterministic local NLP: spaCy, PKE (optional), YAKE (optional).
- Local STT fallback using `faster-whisper` **only when** no transcript, captions, or lyrics are available.
- `yt-dlp` for audio download **only inside** the Python NLP service as a fallback.
- LRCLIB for song lyrics (future/optional).

### Prohibited
- LLMs (OpenAI, Gemini, Claude, etc.).
- Cloud AI services for vocabulary extraction.
- Sending transcripts to any LLM.
- Frontend contacting YouTube directly.
- Scraping lyrics pages manually.

---

## 3. Architecture

### Frontend (TypeScript/React)

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `CreateYouTubeDeckModal` | `src/components/modals/` | URL input, validation, loading/error states |
| `VocabularyPreview` | `src/components/modals/` | Two-column preview (value1/value2), no checkboxes, create deck |
| `youtubeDeckService` | `src/services/` | Calls Cloud Function with `{ url }` only |

**The frontend NEVER contacts YouTube.** It only sends `{ url }` to the Cloud Function.

### Backend (Node.js — Firebase Cloud Functions)

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `createYouTubeDeck` route | `backend/src/functions/src/routes/youtubeDeckRoutes.js` | Auth, URL validation, orchestration, caching |
| `TranscriptProvider` | `backend/src/functions/src/services/transcriptProvider/` | Abstraction to obtain transcript (encapsulates YouTube access) |
| `SongDetectionService` | `backend/src/functions/src/services/songDetectionService/` | Identify artist/track, call LRCLIB (future) |

### NLP Service (Python — FastAPI)

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `main.py` | `backend/nlp-server/` | FastAPI app, `/extract-vocabulary` endpoint |
| `normalizer.py` | `backend/nlp-server/` | Clean transcript, preserve contractions, remove caption artifacts |
| `extractor.py` | `backend/nlp-server/` | Linguistic phrase/word extraction (spaCy-based, PKE/YAKE optional) |
| `ranker.py` | `backend/nlp-server/` | Score, rank, deduplicate vocabulary items |
| `sttFallback.py` | `backend/nlp-server/` | `yt-dlp` audio download + `faster-whisper` STT |

---

## 4. Data Flow

```text
User
  │
  ▼
Dashboard ──[click "Desde YouTube"]──► CreateYouTubeDeckModal
  │                                         │
  │           paste URL + submit             │
  │                                         ▼
  │                              validate URL
  │                                         │
  │           callFunction(                 │
  │             'createYouTubeDeck',        │
  │             { url }                     │
  │           )                             │
  │                                         ▼
  │                              Cloud Function
  │                                         │
  │                    ┌────────────────────┘
  │                    │
  │                    ▼
  │              Transcript Provider
  │                    │
  │         ┌──────────┴──────────┐
  │         │                     │
  │    transcript found?      no transcript
  │         │                     │
  │         │                     ▼
  │         │           Python NLP Service
  │         │                     │
  │         │          ┌──────────┴──────────┐
  │         │          │                     │
  │         │     text provided?      no text
  │         │          │                     │
  │         │          │                     ▼
  │         │          │           Internal STT fallback
  │         │          │                     │
  │         │          │               ┌─────┴─────┐
  │         │          │               │           │
  │         │          │           lyrics?     no lyrics
  │         │          │               │           │
  │         │          │              YES          NO
  │         │          │               │           │
  │         │          │               │           ▼
  │         │          │               │     yt-dlp (audio only)
  │         │          │               │           │
  │         │          │               │     faster-whisper STT
  │         │          │               │           │
  │         │          │               └─────┬─────┘
  │         │          │                     │
  │         │          └──────────┬──────────┘
  │         │                     │
  │         └──────────┬──────────┘
  │                    │
  │                    ▼
  │          Transcript normalization
  │                    │
  │                    ▼
  │          spaCy linguistic analysis
  │                    │
  │         ┌──────────┴──────────┐
  │         │                     │
  │    Phrase extraction   Word extraction
  │         │                     │
  │         └──────────┬──────────┘
  │                    │
  │                    ▼
  │                Ranking
  │                    │
  │              Deduplication
  │                    │
  │                    ▼
  │           VocabularyResult
  │                    │
  │           ◄── response ─┤
  ▼                    ▼
VocabularyPreview
  - Phrases first, then words
  - Checkbox select/deselect
  - No inline edit (MVP)
  - Context + timestamp
  - "Crear Baraja" button
        │
        ▼
  handleCreateList(name, concept, selectedAssociations)
        │
        ▼
  Existing deck creation flow (Firestore, quota, activity)
```

**Critical constraint:** The Cloud Function **never** downloads audio, **never** invokes `yt-dlp`, and **never** runs `faster-whisper`. All STT fallback logic is encapsulated inside the Python NLP service. The Cloud Function is strictly an orchestrator: auth, URL validation, transcript provider call, cache lookup, and Python service invocation.

---

## 5. Transcript Strategy

### Location
All transcript fetching happens **exclusively in the backend** (`backend/src/functions/src/services/transcriptProvider/`).

### Abstraction

```ts
interface TranscriptProvider {
  getTranscript(source: VideoSource): Promise<TranscriptResult | null>;
}

interface VideoSource {
  url: string;
  videoId: string;
}

interface TranscriptResult {
  segments: TranscriptSegment[];
  language?: string;
}

interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}
```

### Implementation
- The Cloud Function resolves the video ID from the URL.
- It delegates to `TranscriptProvider.getTranscript()`.
- The provider encapsulates the YouTube library choice. Switching from `youtube-transcript` to another implementation does not affect the UI.

### Fallback
- If `TranscriptProvider` returns `null`, the Cloud Function calls the Python NLP service with a flag indicating that the service must perform STT fallback internally.
- The Cloud Function **never** executes `yt-dlp` or `faster-whisper` directly.

---

## 6. NLP Service Strategy

### Endpoint

```
POST /extract-vocabulary
{
  "text": "raw transcript text",
  "segments": [ { "text": "...", "start": 123.4, "duration": 2.5 }, ... ],
  "language": "en",
  "maxItems": 50,
  "sttFallback": false
}
```

**Note:** The endpoint accepts `segments` (with timestamps) when available from a transcript, or plain `text` when coming from lyrics or STT.

### Response

```json
{
  "video": {
    "id": "abc123",
    "title": "Example Video",
    "url": "https://youtube.com/watch?v=abc123"
  },
  "source": "youtube-transcript" | "youtube-stt" | "lyrics",
  "items": [
    {
      "term": "figure out",
      "type": "phrase",
      "frequency": 4,
      "context": "I'm trying to figure out what happened.",
      "start": 123.4,
      "score": 0.92
    }
  ]
}
```

### Internal Pipeline

```text
Input (text + optional segments)
    │
    ▼
Normalize
    │
    ▼
Sentence segmentation (spaCy)
    │
    ▼
Linguistic analysis per sentence
    │
    ├── Phrase candidates (spaCy-based)
    │     ├── phrasal verbs
    │     ├── verb + preposition
    │     ├── adjective + preposition
    │     ├── collocations
    │     ├── common constructions
    │     └── useful n-grams
    │
    └── Word candidates (spaCy-based)
          ├── tokenization
          ├── POS filtering
          ├── stop-word removal
          ├── lemmatization
          └── frequency count
    │
    ▼
Candidate scoring
    │
    ▼
Deduplication / overlap resolution
    │
    ▼
Final VocabularyItem list
```

### STT Fallback (Exclusively Inside Python Service)

**The Cloud Function never executes `yt-dlp` or `faster-whisper`.**

If the Cloud Function cannot obtain a transcript, it calls the Python NLP service with `sttFallback: true` and without `text`/`segments`. The Python service then:

1. Calls `yt-dlp` to download **audio only** (no video).
2. Runs `faster-whisper` locally to generate a transcript.
3. Continues with normalization and extraction.

The Python service returns `source: "youtube-stt"` when this path is used.

### Orchestration Rules

- Cloud Function responsibilities: auth, URL validation, video ID extraction, cache lookup, `TranscriptProvider` invocation, Python service invocation, response formatting.
- Python Service responsibilities: transcript normalization, linguistic analysis, phrase/word extraction, ranking, deduplication, STT fallback.
- **No cross-boundary leakage:** audio download, STT inference, and heavy NLP stay inside the Python service.

---

## 7. Phrase Extraction Strategy (Core)

### Principle
Phrases are **reusable chunks**, not full sentences.

Given:
> "I'm trying to figure out what happened yesterday."

The vocabulary item should be:
- **Term:** `figure out`
- **Context:** `I'm trying to figure out what happened yesterday.`

### Core Mechanism: Linguistic Pattern Matching (spaCy)

The phrase extractor is **NOT** a generic noun-chunk or keyphrase extractor. It is a rule-based linguistic pattern matcher built on spaCy's dependency parsing and POS tagging. PKE/YAKE may provide optional supplementary signals, but the primary candidates come from the patterns below.

---

### Pattern 1 — Phrasal Verbs (Verb + Particle)

**Dependency pattern:** `verb` + `prt` (particle)

**spaCy token pattern:**
- Head token: `POS = VERB`
- Child token: `dep = prt` (particle)

**Examples:**
- `figure out`
- `give up`
- `look after`
- `run into`
- `end up`
- `put off`
- `turn on`

**Rule:**
- Extract the verb + particle pair as a candidate.
- If the verb has multiple particles (rare), prefer the most common phrasal verb pattern.
- Preserve the original surface form and casing.

---

### Pattern 2 — Verb + Preposition

**Dependency pattern:** `verb` + `prep` (prepositional object)

**spaCy token pattern:**
- Head token: `POS = VERB`
- Child token: `dep = prep` or `dep = pobj` via `ADP`

**Examples:**
- `depend on`
- `believe in`
- `deal with`
- `wait for`
- `agree with`
- `care about`

**Rule:**
- Extract verb + preposition as a candidate.
- Include the preposition object only if it forms a known collocation (see Pattern 4).
- Otherwise, keep it as verb + preposition.

---

### Pattern 3 — Adjective + Preposition

**Dependency pattern:** `adj` + `prep`

**spaCy token pattern:**
- Head token: `POS = ADJ`
- Child token: `dep = prep` or `dep = pobj` via `ADP`

**Examples:**
- `interested in`
- `afraid of`
- `responsible for`
- `good at`
- `similar to`
- `aware of`

**Rule:**
- Extract adjective + preposition as a candidate.
- Include the noun object only if it forms a known collocation.

---

### Pattern 4 — Collocations (Noun + Noun / Verb + Noun / Adj + Noun)

**Detection strategies:**

1. **spaCy noun chunks** with specific POS patterns:
   - `NOUN + NOUN` (compound noun): `traffic light`, `user experience`
   - `VERB + NOUN` (verb + object collocation): `make a decision`, `take responsibility`
   - `ADJ + NOUN` (adjective + noun collocation): `heavy traffic`, `strong recommendation`

2. **Dependency pattern:** `compound` or `dobj` (direct object) combined with verb frequency.

**Rule:**
- Extract noun chunks where the head is a content word (NOUN, VERB, ADJ) and the modifiers are also content words.
- Filter out chunks where the head is a pronoun, determiner, or auxiliary.
- Prioritize chunks that appear in a predefined list of common English collocations (can be a static set in the code).

**Static collocation seed list (examples, not exhaustive):**
- `make a decision`
- `take responsibility`
- `heavy traffic`
- `strongly recommend`
- `make progress`
- `take a break`
- `pay attention`

---

### Pattern 5 — Grammatical Constructions / Common Expressions

**Detection:** Regex + POS pattern matching on sentence tokens.

**Patterns to match:**
- `be supposed to` → `AUX + ADJ + PART + TO`
- `get used to` → `VERB + ADJ + PART + TO`
- `used to` → `VERB + PART + TO` (historical present)
- `in order to` → `ADP + NOUN + PART + TO`
- `a lot of` → `DET + NOUN + ADP`
- `by the way` → `ADP + DET + NOUN`
- `I've been trying` → `PRON + AUX + AUX + VERB` (present perfect continuous)
- `It turns out that` → `PRON + VERB + PART + SCONJ`
- `The best way to` → `DET + ADJ + NOUN + PART + TO`

**Rule:**
- Use token-level regex with POS constraints, not raw string matching.
- Match case-insensitively but preserve original casing in the output.

---

### Pattern 6 — Useful n-grams (2–5 tokens)

**When to use:**
- As a fallback when dependency patterns do not capture a useful chunk.
- To catch multi-word expressions that span across dependency boundaries but are syntactically coherent.

**POS constraints for n-grams:**
- Must contain at least one content word (NOUN, VERB, ADJ, ADV).
- Cannot be composed entirely of stop words, determiners, pronouns, or auxiliary verbs.
- Preferred lengths: 2–4 tokens. 5 tokens only if the pattern is a known grammatical construction (Pattern 5).

**Filtering rules:**
- Reject n-grams that are entirely function words.
- Reject n-grams where the first token is a pronoun and the rest are function words (e.g., `it is a`).
- Reject n-grams that are subsets of already-accepted higher-scoring phrases (deduplication handles this later, but early filtering reduces noise).

---

### Extraction Order

Candidates are generated in this priority order:

1. Phrasal verbs (Pattern 1)
2. Verb + preposition (Pattern 2)
3. Adjective + preposition (Pattern 3)
4. Collocations (Pattern 4)
5. Grammatical constructions (Pattern 5)
6. Useful n-grams (Pattern 6)

Within each pattern, candidates are scored by:
- Pattern strength (phrasal verb > collocation > n-gram)
- Frequency in the transcript
- Position (earlier sentences score slightly higher)

---

### What NOT to Extract

- Full sentences.
- Single stop words.
- Determiner + noun chunks where the noun is trivial (e.g., `the thing`, `a person`).
- Overlapping fragments when a stronger parent phrase exists (e.g., if `figure out` is found, do not also extract `figure` from the same sentence as a phrase candidate; `figure` may still appear as a word candidate).
- Pure punctuation artifacts.
- Non-ASCII noise from caption formatting (e.g., `[Music]`, `(applause)`).

---

### PKE / YAKE Role (Optional, Supplementary Only)

- If PKE or YAKE are installed, their outputs are merged as **additional candidates** with a lower base score than any spaCy pattern candidate.
- PKE/YAKE candidates that overlap with spaCy-extracted phrases are discarded.
- PKE/YAKE candidates that do not overlap may be included only if they score above a threshold and pass the same POS/stop-word filters as word candidates.
- **PKE/YAKE never override or replace the spaCy patterns.**

---

## 8. Word Extraction Strategy

- Tokenize with spaCy.
- Filter by POS: prefer nouns, verbs, adjectives, adverbs.
- Remove stop words.
- Lemmatize for grouping variants: `running`, `runs`, `ran` → `run`.
- Preserve original surface form for display.
- Count frequency across transcript.

---

## 9. Stop Words Policy

| Context | Behavior |
|---------|----------|
| **Phrases** | Stop words are **preserved**. `take care of`, `a lot of`, `in order to` remain intact. |
| **Single words** | Stop words are **removed**. `the`, `a`, `of`, `to`, `and`, `is`, etc. do not become flashcards. |

This is critical: removing stop words from phrases destroys useful expressions.

---

## 10. Ranking Strategy

### Phrase Score Components

```text
phrase_score =
    linguistic_usefulness (phrasal verb > collocation > n-gram)
  + frequency
  + length_bonus (2-4 tokens preferred)
  + structural_relevance (dependency pattern strength)
  + position_bonus (earlier in transcript)
  - triviality_penalty (too generic patterns)
  - overlap_penalty (if a longer useful phrase already covers it)
```

### Word Score Components

```text
word_score =
    frequency
  + lexical_relevance (content word POS)
  + specificity_bonus (rare but useful)
  - stop_word_penalty
  - triviality_penalty (very common words like "people", "thing", "really")
```

### Key Principle
**Frequency ≠ usefulness.** A phrase appearing 2–3 times can be more valuable than a word appearing 20 times.

---

## 11. Deduplication & Overlap Resolution

### Problem
Avoid redundant results:
```text
figure
figure out
figure out how
```

### Rule
- If `figure out` is identified as a strong phrasal verb, it takes priority over `figure`.
- Longer useful phrases take precedence over shorter fragments that are subsets.
- Case-insensitive deduplication: `Figure out`, `figure out`, `FIGURE OUT` → single item.

### Algorithm
1. Sort candidates by score descending.
2. For each candidate, check if it is a substring/overlap of a higher-scoring accepted candidate.
3. If overlap detected and the longer candidate is strong, reject the shorter one.
4. Accept the candidate if no stronger overlap exists.

---

## 12. Context Preservation

Every vocabulary item retains:

```json
{
  "term": "figure out",
  "type": "phrase",
  "frequency": 3,
  "context": "I'm trying to figure out what happened.",
  "start": 123.4,
  "score": 0.92
}
```

- `term`: the chunk to learn.
- `context`: the original sentence from the video.
- `start`: timestamp in seconds (when available from transcript segments).

This enables:
- Flashcard generation with real context.
- Potential future feature: jump to timestamp in video.

---

## 13. Result Priority

The final list MUST be explicitly ordered:

```text
1. Useful phrases / chunks
2. Multi-word expressions / collocations
3. Individual vocabulary words
```

Example output:
```text
1. figure out
2. take care of
3. be supposed to
4. overwhelming
5. eventually
```

The UI displays phrases first, then words. The ranking algorithm must enforce this hierarchy.

---

## 14. Preview

### Flow
```text
Analyze video
      ↓
Vocabulary preview (two columns, no checkboxes)
      ↓
Create deck → navigate to Editor
      ↓
Editor: translate value2 via language selector
      ↓
Flashcards ready to play
```

### Rules
- The baraja is **NOT** created in Firestore during analysis.
- The baraja is created **only** when the user confirms.
- No checkboxes — all items are included automatically.
- No inline editing in preview.
- Column names are literally `value1` and `value2` (not Term/Definition).
- `definition` field is created empty (`''`).
- `concept` is set to `'value1 / value2'`.

### UI
```
┌───────────────────────────────────────────────────────────────┐
│  Vocabulary preview                                     [X]   │
│  English Conversation - 25 minutes                            │
│                                                               │
│  18 frases · 32 palabras                                      │
│───────────────────────────────────────────────────────────────│
│                                                               │
│     value1                    │     value2                    │
│  ─────────────────────────────│─────────────────────────────  │
│  figure out                   │                               │
│  take care of                 │                               │
│  be supposed to               │                               │
│  overwhelming                 │                               │
│  eventually                   │                               │
│  make sense                   │                               │
│  in order to                  │                               │
│  ...                          │                               │
│                                                               │
│───────────────────────────────────────────────────────────────│
│                                [Cerrar]      [Crear Baraja]   │
└───────────────────────────────────────────────────────────────┘
```

### Post-Preview Flow
```text
VocabularyPreview.onAccept(associations)
      ↓
associations created with:
  - term: item.term
  - definition: '' (empty)
  - concept: 'value1 / value2'
      ↓
App.tsx: createListCore(name, 'value1 / value2', associations)
      ↓
navigate('editor')
      ↓
ListEditor renders columns derived from concept.split('/'):
  ┌──────────┬──────────┐
  │ value1   │ value2   │
  └──────────┴──────────┘
      ↓
User can translate value2 via toolbar
```

---

## 14.1 Translation in Editor

### Flow
```text
Editor opens with value1 (vocabulary) | value2 (empty)
      ↓
User selects rows (checkboxes)
      ↓
User picks target language from dropdown (ES/FR/DE/PT)
      ↓
User clicks "Traducir"
      ↓
translationService.translateBatch(uid, texts, targetLang, 'en')
      ↓
Cloud Function → Google Translate API v3
      ↓
value2 (definition field) populated with translations
      ↓
Flashcards ready to play
```

### Supported Languages (max 4)

| Code | Label | Flag |
|------|-------|------|
| `es` | Español | 🇪🇸 |
| `fr` | Francés | 🇫🇷 |
| `de` | Alemán | 🇩🇪 |
| `pt` | Portugués | 🇧🇷 |

### UI — Editor Toolbar
```
┌─────────────────────────────────────────────────────────────────┐
│  [Search...]    [🌐 ▾] [Traducir] [Eliminar]  [Import] [+Row] │
│                     │                                           │
│                     └── Language dropdown (visible when rows    │
│                         are selected)                          │
└─────────────────────────────────────────────────────────────────┘
```

### Backend Change
The `translateVocabulary` Cloud Function must accept `sourceLang` as an optional parameter (default: `'en'`).

**Current (hardcoded):**
```js
sourceLanguageCode: "en",
```

**Updated:**
```js
const { userId, texts, targetLang = "es", sourceLang = "en" } = req.body || {};
// ...
sourceLanguageCode: sourceLang,
```

### Frontend Service Change
`translationService.translateBatch` must accept `sourceLang` parameter:

```ts
async translateBatch(
  userId: string,
  texts: string[],
  targetLang = 'es',
  sourceLang = 'en'
): Promise<TranslationResponse>
```

---

## 15. Cache Strategy

Separate caches:

| Cache | Key | Purpose |
|-------|-----|---------|
| Raw transcript cache | `videoId + language` | Avoid re-fetching transcript from YouTube |
| Vocabulary extraction cache | `videoId + language + extractorVersion` | Avoid re-running NLP on same transcript |

This allows changing the NLP algorithm later without re-downloading transcripts.

---

## 16. Lyrics / Songs (Future)

Priority:
```text
YouTube URL
   ↓
Can we identify artist + track?
   ↓
YES → LRCLIB (synced lyrics preferred, plain lyrics fallback)
NO
   ↓
YouTube transcript
   ↓
NO transcript
   ↓
yt-dlp + faster-whisper (inside Python service)
```

LRCLIB is called from the Cloud Function (or Python service) as an optional pre-step. If lyrics are found, they are treated as the transcript source.

Not implemented in MVP.

---

## 17. Error Handling

| Case | Behavior |
|------|----------|
| No captions, no lyrics | STT fallback inside Python service |
| Private / age-restricted video | Error: "Video not accessible" |
| Transcript too short (< 30s) | Error: "Video too short" |
| Too many vocabulary items | Cap at `maxItems` (default 50) |
| Quota exceeded | Reuse existing quota check in `createListCore` |
| Network failure | Retry once, then show error with "Reintentar" |
| Python service unavailable | Error: "Processing service unavailable" |
| Invalid YouTube URL | Error: "Invalid URL" |

---

## 18. Types & Interfaces

All types live in `src/types/` or `backend/src/functions/src/types/`. No types inside components.

### Frontend Types (`src/types/youtube-deck.ts`)

```ts
export interface YouTubeVideoInfo {
  id: string;
  title: string;
  url: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface VocabularyItem {
  term: string;
  type: 'phrase' | 'word';
  frequency: number;
  context: string;
  start: number;
  score: number;
}

export interface VocabularyResult {
  video: YouTubeVideoInfo;
  source: 'youtube-transcript' | 'youtube-stt' | 'lyrics';
  items: VocabularyItem[];
}

export interface VideoSource {
  url: string;
  videoId: string;
}
```

### Backend Interfaces (`backend/src/functions/src/services/transcriptProvider/`)

```ts
interface TranscriptProvider {
  getTranscript(source: VideoSource): Promise<TranscriptResult | null>;
}
```

### Python Service Interfaces (`backend/nlp-server/`)

```python
class PhraseExtractor(ABC):
    @abstractmethod
    def extract(self, text: str, doc) -> List[PhraseCandidate]:
        pass

class WordExtractor(ABC):
    @abstractmethod
    def extract(self, text: str, doc) -> List[WordCandidate]:
        pass

class VocabularyRanker(ABC):
    @abstractmethod
    def rank(self, phrases: List[PhraseCandidate], words: List[WordCandidate]) -> List[VocabularyItem]:
        pass
```

---

## 19. Dependencies

### Frontend (`package.json`)

No new dependencies for transcript fetching.

```json
{
  "dependencies": {
    "nlpService client": use existing `callFunction` utility
  }
}
```

### Backend Cloud Functions (`backend/src/functions/package.json`)

No new runtime dependencies required for orchestration. Existing `@google-cloud/speech` is already present.

### Python NLP Service (`backend/nlp-server/requirements.txt`)

```txt
fastapi==0.115.0
uvicorn[standard]==0.30.0
spacy==3.7.0
pke==2.0.1
yake==0.4.8
yt-dlp==2024.3.10
faster-whisper==1.0.3
```

**Rationale:**
- **spaCy**: core linguistic analysis (sentence segmentation, tokenization, POS, dependency parsing, noun chunks, lemmatization). Deterministic, offline, CPU-friendly.
- **pke**: optional secondary signal for keyphrase extraction (TextRank, FirstPhrases). NOT the primary mechanism.
- **yake**: optional lightweight statistical signal. NOT the primary mechanism.
- **yt-dlp**: audio-only download when transcript is unavailable. Runs inside Python service only.
- **faster-whisper**: local STT fallback. CPU-friendly, no cloud APIs. Runs inside Python service only.

**Minimization:** If PKE or YAKE are unavailable, the service falls back to pure spaCy-based extraction + handcrafted n-gram rules.

---

## 20. Runtime Decision

| Layer | Runtime | Reason |
|-------|---------|--------|
| Frontend | Node.js / TypeScript | Existing stack, UI, orchestration |
| Backend | Node.js / Firebase Functions | Existing stack, auth, orchestration, caching |
| NLP | Python / FastAPI | spaCy, PKE, faster-whisper have no production-grade TS equivalents |

The Python service is an independent HTTP service (Docker / Cloud Run / local). The Cloud Function calls it synchronously.

**Why not pure TypeScript?**
- spaCy, PKE, and faster-whisper do not have production-ready Node.js equivalents.
- Embedding-heavy TS alternatives violate the "no unnecessary ML" constraint.

**Why not Python inside Cloud Function?**
- Firebase Functions v2 runs on Node.js runtime.
- A standalone FastAPI service is easier to test, scale, and replace.

---

## 21. Implementation Plan

### Step 1 — Frontend Types

Create `src/types/youtube-deck.ts` with `YouTubeVideoInfo`, `TranscriptSegment`, `VocabularyItem`, `VocabularyResult`, `VideoSource`.

**Verification:** `tsc --noEmit` passes.

---

### Step 2 — Backend: Transcript Provider Abstraction

Create `backend/src/functions/src/services/transcriptProvider/index.ts`:

```ts
export interface TranscriptProvider {
  getTranscript(source: VideoSource): Promise<TranscriptResult | null>;
}

export interface VideoSource {
  url: string;
  videoId: string;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  language?: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}
```

Implement `YouTubeTranscriptProvider` that uses `youtube-transcript` (added as a **backend** dependency, not frontend).

**Verification:** Unit test with known public YouTube video.

---

### Step 3 — Backend: Cloud Function Route

Create `backend/src/functions/src/routes/youtubeDeckRoutes.js`:

```js
exports.createYouTubeDeck = onRequest({ cors: true, timeoutSeconds: 300, memory: "512MiB" }, async (req, res) => {
  // 1. Auth check
  // 2. Validate URL
  // 3. Extract video ID
  // 4. Check cache
  // 5. Call TranscriptProvider.getTranscript()
  // 6. If no transcript, call Python NLP service with sttFallback=true
  // 7. If transcript found, normalize and call Python NLP service
  // 8. Return VocabularyResult
});
```

Register in `backend/src/functions/index.js`.

**Verification:** Deploy to emulator, hit endpoint with test URL, assert response shape.

---

### Step 4 — Python NLP Service

Create `backend/nlp-server/`:

```
backend/nlp-server/
  main.py          # FastAPI app, /extract-vocabulary endpoint
  normalizer.py    # Transcript normalization
  extractor.py     # PhraseExtractor, WordExtractor (spaCy-based)
  ranker.py        # VocabularyRanker
  sttFallback.py   # yt-dlp + faster-whisper
  requirements.txt
  Dockerfile
```

**Endpoint contract:**

```json
POST /extract-vocabulary
{
  "text": "raw transcript text",
  "segments": [...],
  "language": "en",
  "maxItems": 50,
  "sttFallback": false
}
```

**Internal pipeline:**
1. `normalizer.py` → clean whitespace, remove caption artifacts, preserve apostrophes/contractions.
2. `extractor.py` → sentence segmentation (spaCy), phrase extraction (dependency patterns, noun chunks, common expressions, n-grams), word extraction (spaCy tokens, POS filter, stop-word removal, lemmatization).
3. `ranker.py` → score phrases/words, deduplicate overlaps, enforce phrase-first priority.
4. `sttFallback.py` → if `sttFallback=true` and no text provided, download audio with yt-dlp and run faster-whisper.

**Verification:** Run service locally, send sample transcript, assert phrase-first output.

---

### Step 5 — Frontend Service & Modals

Create `src/services/youtubeDeckService.ts`:

```ts
export const youtubeDeckService = {
  async createVocabularyDeck(url: string): Promise<VocabularyResult> {
    return callFunction<VocabularyResult>('createYouTubeDeck', { url });
  }
};
```

Create `src/components/modals/CreateYouTubeDeckModal.tsx`:
- URL input with validation
- Loading state with progress message
- Error state with retry
- On success: open `VocabularyPreview`

Create `src/components/modals/VocabularyPreview.tsx`:
- Display video title + source
- Two-column table: "value1" (vocabulary) | "value2" (empty)
- No checkboxes — all items included automatically
- "Crear Baraja" button → creates list with `definition: ''`, `concept: 'value1 / value2'`
- "Cerrar" button

**Verification:** Component renders two columns, creates list with correct concept.

---

### Step 6 — Dashboard Integration

In `src/components/views/Dashboard.tsx`, add a new button in the action bar:

```tsx
<button
  onClick={() => setShowYouTubeModal(true)}
  className="..."
>
  <YouTubeIcon />
  Desde YouTube
</button>
```

Wire modals into `App.tsx`.

**Verification:** E2E flow: click button → paste URL → see preview → create deck → deck appears in dashboard.

---

### Step 6.1 — Translation in Editor

Modify `src/components/ListEditor.tsx`:
- Add language dropdown (ES/FR/DE/PT) next to the "Traducir" button
- Dropdown visible only when rows are selected
- Modify `handleTranslateSelected` to write to `definition` field (value2) instead of `translation`
- Pass selected `targetLang` to `translationService.translateBatch`

Modify `src/services/translationService.ts`:
- Add `sourceLang` parameter (default `'en'`)

Modify `backend/src/functions/src/routes/translateVocabulary.js`:
- Accept `sourceLang` from request body (default `'en'`)
- Pass to `translateTexts` instead of hardcoded `"en"`

**Verification:** Select rows → pick language → click Traducir → value2 populated.

---

### Step 6.2 — Backend Bug Fixes

Fix `backend/nlp-server/vocabulary_ranker.py`:
- `_is_overlap` must use word boundary matching to avoid rejecting words that contain preposition substrings (e.g., "begin" contains "in")

Fix `backend/src/functions/src/routes/youtubeDeckRoutes.js`:
- Add null guard before `res.json(vocabularyResult)` at line 147

Fix `backend/nlp-server/phrase_extractor.py`:
- Frequency counting at line 238 uses `text.lower().count()` which counts substrings. Must use token-level counting.

Fix `backend/nlp-server/main.py`:
- Validate `text.strip()` not just `text` at line 39

Fix `backend/nlp-server/stt_fallback.py`:
- Cache `WhisperModel` as singleton instead of reloading per request

Fix `backend/src/functions/src/services/transcriptProvider/index.js`:
- Accept `videoId` as parameter instead of re-extracting from URL

---

### Step 7 — Song Detection & Lyrics (Post-MVP)

1. Extract `artist` / `track` from YouTube metadata or title heuristics.
2. Call LRCLIB API from Cloud Function.
3. If synced lyrics found, use them as transcript.
4. If plain lyrics found, use them.
5. If no lyrics, fall back to transcript → STT.

Interface: `LyricsProvider` in backend.

---

### Step 8 — Edge Cases

| Case | Behavior |
|------|----------|
| No captions, no lyrics | STT fallback inside Python service |
| Private / age-restricted video | Error: "Video not accessible" |
| Transcript too short (< 30s) | Error: "Video too short" |
| Too many items | Cap at `maxItems` (default 50) |
| Quota exceeded | Reuse existing quota check |
| Network failure | Retry once, then error with "Reintentar" |
| Python service down | Error: "Processing service unavailable" |

---

### Step 9 — Testing Strategy

1. **Frontend unit tests** (`vitest`):
   - URL validation.
   - Preview component rendering and selection.

2. **Backend unit tests**:
   - `TranscriptProvider` with mocked YouTube responses.
   - Cache logic.

3. **Python service tests** (`pytest`):
   - Normalizer: whitespace, apostrophes, caption artifacts.
   - Phrase extractor: phrasal verbs, collocations, common expressions.
   - Word extractor: stop-word filtering, lemmatization.
   - Ranker: deduplication, scoring, phrase-first ordering.
   - STT fallback: mocked yt-dlp + faster-whisper.

4. **Integration tests**:
   - Cloud Function with mocked YouTube and mocked Python service.
   - Full flow against local emulators.

---

## 22. Files to Create / Modify

### New Files
- `src/types/youtube-deck.ts`
- `src/services/youtubeDeckService.ts`
- `src/components/modals/CreateYouTubeDeckModal.tsx`
- `src/components/modals/VocabularyPreview.tsx`
- `backend/src/functions/src/routes/youtubeDeckRoutes.js`
- `backend/src/functions/src/services/transcriptProvider/index.ts`
- `backend/nlp-server/main.py`
- `backend/nlp-server/normalizer.py`
- `backend/nlp-server/extractor.py`
- `backend/nlp-server/ranker.py`
- `backend/nlp-server/sttFallback.py`
- `backend/nlp-server/requirements.txt`
- `backend/nlp-server/Dockerfile`
- `docs/plans/2026-08-26-youtube-vocabulary-deck.md` (this file)

### Modified Files
- `backend/src/functions/index.js` (register new route)
- `backend/src/functions/package.json` (add `youtube-transcript` as backend dependency)
- `src/App.tsx` (add modal routing, concept = 'value1 / value2')
- `src/components/views/Dashboard.tsx` (add button)
- `src/components/ListEditor.tsx` (language dropdown, translate writes to definition)
- `src/services/translationService.ts` (add sourceLang param)
- `backend/src/functions/src/routes/translateVocabulary.js` (add sourceLang param)
- `backend/nlp-server/vocabulary_ranker.py` (fix _is_overlap)
- `backend/nlp-server/phrase_extractor.py` (fix frequency counting)
- `backend/nlp-server/main.py` (fix empty text validation)
- `backend/nlp-server/stt_fallback.py` (singleton WhisperModel)
- `backend/src/functions/src/services/transcriptProvider/index.js` (receive videoId)

---

## 23. Version Bump

Per `AGENTS.md` rules, on merge to `main`:
- `src/constants/version.ts`: current → next minor (new feature)
- `package.json`: current → next minor

---

## 24. Open Questions

1. Should the Cloud Function call the Python service synchronously or enqueue a job? **Recommendation:** synchronous for MVP (timeout 300s), async later.
2. Where to host the Python service? **Recommendation:** Cloud Run for production, local Docker during development.
3. Should we cache vocabulary results by `videoId + language + extractorVersion`? **Recommendation:** yes, 24h TTL in Firestore.

---

## 25. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| YouTube blocks transcript requests | Medium | High | Rotating user agents, rate limits, STT fallback |
| Python service latency > 10s | Medium | Medium | Cache by videoId + language, 300s timeout |
| spaCy model download size | Low | Low | Use `en_core_web_sm` (~12 MB), download at build time |
| faster-whisper CPU usage on STT fallback | Medium | Medium | Only run when transcript unavailable; warn user |
| Quota abuse via endpoint | Low | High | Require auth, rate-limit, reuse existing quota system |
| Phrase extraction quality | Medium | Medium | Iterate on ranking weights; PKE/YAKE as fallback signals |
