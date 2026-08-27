# NLP Vocabulary Extraction — Improvement Plan

**Date:** 2026-08-26
**Status:** Proposed
**Scope:** Optimize performance, improve quality, and expand coverage of the NLP pipeline for YouTube vocabulary extraction

---

## 1. Current State

The pipeline processes YouTube transcripts through: normalizer → phrase extractor (6 extractors) → word extractor → ranker → deduplicator.

### Identified Issues

| Area | Issue | Impact |
|------|-------|--------|
| Performance | `nlp(text)` called twice per chunk (phrases + words) | 2x processing time |
| Performance | Multi-word frequency uses `re.findall` per candidate | O(candidates × text_length) |
| Performance | n-gram extractor generates all 2-3 word windows | ~3N candidates for N tokens |
| Quality | Cross-sentence garbage phrases ("pay to" from "...pay attention... to succeed...") | Junk in results |
| Quality | verb_prep / adj_prep extract too many generic combos ("go to", "look at") | Low-value phrases diluted |
| Quality | No contraction expansion ("I've been" → partial match issues) | Missed patterns |
| Quality | COMMON_EXPRESSIONS has only 19 patterns | Limited coverage |
| Quality | No proper noun / entity filtering | Names mixed with vocabulary |
| Scoring | Basic scoring doesn't weight educational value | Good and bad items ranked similarly |
| Scoring | Word scoring only uses frequency × 0.5 | No difficulty or usefulness signal |
| Architecture | No spaCy `Doc` caching between extractors | Redundant parsing |

---

## 2. Proposed Changes

### Phase 1: Performance (High Priority)

#### 2.1 Single NLP Parse Per Chunk
**File:** `main.py`, `phrase_extractor.py`

Currently `extract_phrases()` and `extract_words()` both call `nlp(text)` independently. Parse once, pass the `Doc` object to both.

```
# Before
phrases = extract_phrases(chunk, segments)   # calls nlp()
words = extract_words(chunk, segments)       # calls nlp() again

# After
doc = nlp(chunk)
phrases = extract_phrases_from_doc(doc, segments)
words = extract_words_from_doc(doc, segments)
```

**Estimated impact:** ~40% reduction in processing time.

#### 2.2 Pre-computed Word Frequency Map
**File:** `phrase_extractor.py`

Replace per-candidate regex with a sliding window counter over pre-tokenized text.

```python
from collections import Counter

def _build_ngram_freq(tokens: List[str], max_n: int = 3) -> Dict[str, int]:
    freq = Counter()
    for size in range(2, max_n + 1):
        for i in range(len(tokens) - size + 1):
            ngram = " ".join(tokens[i:i + size])
            freq[ngram] += 1
    return freq
```

Then look up each candidate in O(1) instead of running regex.

**Estimated impact:** ~60% reduction in frequency counting time for large texts.

#### 2.3 Limit N-gram Candidates Aggressively
**File:** `phrase_extractor.py`

Current `_extract_useful_ngrams` generates windows for every position. Add early exits:

- Skip windows where >50% tokens are function words (DET, ADP, CCONJ, AUX, PART, PRON)
- Skip windows that don't contain at least one NOUN or VERB
- Cap total n-gram candidates at 500 per chunk before scoring

**Estimated impact:** 30-50% fewer candidates to process.

---

### Phase 2: Quality (High Priority)

#### 2.4 Sentence-Boundary Filtering
**File:** `phrase_extractor.py`

The n-gram extractor currently ignores sentence boundaries, creating garbage like "pay to" from "...pay attention... to succeed...".

**Solution:** Filter n-grams that span sentence boundaries. spaCy `Doc` already provides `sent` attribute on tokens. Reject any n-gram where `window[0].sent != window[-1].sent`.

```python
# In _extract_useful_ngrams
for size in range(2, max_n + 1):
    for i in range(n - size + 1):
        window = tokens[i:i + size]
        if window[0].sent != window[-1].sent:
            continue  # skip cross-sentence n-grams
        ...
```

**Estimated impact:** Eliminates ~20-30% of garbage phrases.

#### 2.5 Contraction Expansion in Normalizer
**File:** `text_normalizer.py`

Expand common contractions before NLP processing so spaCy can parse them correctly.

```python
CONTRACTIONS = {
    "i've": "i have",
    "i'm": "i am",
    "don't": "do not",
    "doesn't": "does not",
    "didn't": "did not",
    "can't": "cannot",
    "couldn't": "could not",
    "wouldn't": "would not",
    "shouldn't": "should not",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
    "haven't": "have not",
    "hasn't": "has not",
    "hadn't": "had not",
    "won't": "will not",
    "shan't": "shall not",
    "let's": "let us",
    "that's": "that is",
    "what's": "what is",
    "there's": "there is",
    "here's": "here is",
    "where's": "where is",
    "who's": "who is",
    "how's": "how is",
    "it's": "it is",
    "he's": "he is",
    "she's": "she is",
    "we're": "we are",
    "they're": "they are",
    "you're": "you are",
    "we've": "we have",
    "they've": "they have",
    "you've": "you have",
    "i'd": "i would",
    "he'd": "he would",
    "she'd": "she would",
    "we'd": "we would",
    "they'd": "they would",
    "you'd": "you would",
    "i'll": "i will",
    "he'll": "he will",
    "she'll": "she will",
    "we'll": "we will",
    "they'll": "they will",
    "you'll": "you will",
    "isn't": "is not",
    "aren't": "are not",
    "wasn't": "was not",
    "weren't": "were not",
}
```

Apply in `normalize_text()` after cleaning artifacts, before returning.

**Estimated impact:** Better parsing of spoken English transcripts, more accurate POS tags.

#### 2.6 Filter Generic verb_prep / adj_prep
**File:** `phrase_extractor.py`

Many extracted verb+prep and adj+prep combinations are too generic to be useful vocabulary. Add a blacklist:

```python
GENERIC_VERB_PREP = {
    "go to", "come to", "look at", "wait for", "ask for",
    "talk about", "think about", "know about", "hear about",
    "start with", "end with", "stop at", "run to", "walk to",
    "give to", "take to", "put in", "set up", "get to",
}

GENERIC_ADJ_PREP = {
    "good at", "good for", "good with", "bad at", "bad for",
    "ready for", "sure about", "afraid of", "proud of",
    "full of", "aware of", "interested in", "tired of",
}
```

Skip candidates in these sets. Keep the extraction logic for non-generic combinations.

**Estimated impact:** Removes ~30-40% of low-value phrases, improves signal-to-noise ratio.

#### 2.7 Expand COMMON_EXPRESSIONS
**File:** `phrase_extractor.py`

Current list has 19 patterns. Expand to cover more common spoken English patterns:

```python
# Add these patterns
(r"\b(it\s+depends\s+on)\b", "it depends on"),
(r"\b(as\s+far\s+as)\b", "as far as"),
(r"\b(instead\s+of)\b", "instead of"),
(r"\b(apart\s+from)\b", "apart from"),
(r"\b(lead\s+to)\b", "lead to"),
(r"\b(result\s+in)\b", "result in"),
(r"\b(consist\s+of)\b", "consist of"),
(r"\b(refers?\s+to)\b", "refer to"),
(r"\b(belongs?\s+to)\b", "belong to"),
(r"\b(occurs?\s+to)\b", "occur to"),
(r"\b(occurs?\s+in)\b", "occur in"),
(r"\b(deals?\s+with)\b", "deal with"),
(r"\b(looks?\s+like)\b", "look like"),
(r"\b(sounds?\s+like)\b", "sound like"),
(r"\b(feels?\s+like)\b", "feel like"),
(r"\b(seems?\s+like)\b", "seem like"),
(r"\b(turns?\s+out)\b", "turn out"),
(r"\b(makes?\s+sure)\b", "make sure"),
(r"\b(takes?\s+place)\b", "take place"),
(r"\b(comes?\s+up)\b", "come up"),
(r"\b(brings?\s+up)\b", "bring up"),
(r"\b(picks?\s+up)\b", "pick up"),
(r"\b(puts?\s+up)\b", "put up"),
(r"\b(gives?\s+up)\b", "give up"),
(r"\b(ends?\s+up)\b", "end up"),
(r"\b(winds?\s+up)\b", "wind up"),
(r"\b(watches?\s+out)\b", "watch out"),
(r"\b(slows?\s+down)\b", "slow down"),
(r"\b(speeds?\s+up)\b", "speed up"),
(r"\b(catches?\s+up)\b", "catch up"),
(r"\b(keeps?\s+up)\b", "keep up"),
(r"\b(lives?\s+up\s+to)\b", "live up to"),
(r"\b(measures?\s+up\s+to)\b", "measure up to"),
(r"\b(lives?\s+up)\b", "live up"),
(r"\b(has\s+to\s+do\s+with)\b", "has to do with"),
(r"\b(going\s+to)\b", "going to"),
(r"\b(able\s+to)\b", "able to"),
(r"\b(used\s+to)\b", "used to"),
(r"\b(trying\s+to)\b", "trying to"),
(r"\b(getting\s+to)\b", "getting to"),
(r"\b(happens?\s+to)\b", "happen to"),
(r"\b(matters?\s+to)\b", "matter to"),
(r"\b(belongs?\s+to)\b", "belong to"),
(r"\b(plays?\s+a\s+role\s+in)\b", "play a role in"),
(r"\b(takes\s+into\s+account)\b", "take into account"),
(r"\b(comes\s+into\s+play)\b", "come into play"),
(r"\b(makes\s+a\s+ Difference)\b", "make a difference"),
```

**Estimated impact:** +15-20% more recognized expressions.

#### 2.8 Proper Noun / Entity Filtering
**File:** `phrase_extractor.py`

Named entities (PERSON, ORG, GPE, DATE, etc.) are not useful vocabulary. Filter them out from all extractors.

```python
# In phrase extractors, skip tokens that are part of named entities
ent_labels = {ent.label_ for ent in doc.ents}
for ent in doc.ents:
    for token in ent:
        token._.is_entity = True  # mark with custom attribute

# Then in extractors:
if any(t._.is_entity for t in window):
    continue
```

**Estimated impact:** Removes names, places, organizations from vocabulary results.

---

### Phase 3: Scoring Improvements (Medium Priority)

#### 2.9 Weighted Frequency Tiers
**File:** `vocabulary_ranker.py`

Replace linear frequency scoring with tiers:

```python
def _frequency_tier(freq: int) -> float:
    if freq >= 10: return 3.0   # very common
    if freq >= 5:  return 2.0   # common
    if freq >= 3:  return 1.5   # moderate
    if freq >= 2:  return 1.0   # rare but repeated
    return 0.5                   # appeared once
```

**Rationale:** A phrase appearing 15 times is not 15x more valuable than one appearing once. The jump from 1→2 is more meaningful than 10→11.

#### 2.10 Educational Value Score
**File:** `vocabulary_ranker.py`

Add bonus for items that are more useful for language learners:

```python
def _educational_bonus(item: Dict[str, Any]) -> float:
    bonus = 0.0
    # Multi-word expressions are more useful than single words
    if len(item["term"].split()) >= 2:
        bonus += 0.5
    # Idiomatic expressions have high learning value
    if item.get("category") in ("phrasal_verb", "common_expression"):
        bonus += 1.0
    # Words with moderate frequency are ideal for learning
    # (not too rare, not too common)
    if 3 <= item.get("frequency", 0) <= 8:
        bonus += 0.5
    return bonus
```

#### 2.11 Penalize Overly Short or Long Phrases
**File:** `vocabulary_ranker.py`

```python
tokens = len(item["term"].split())
if tokens == 1:
    score -= 0.5  # prefer multi-word
if tokens > 5:
    score -= 1.0  # too long for a flashcard
```

---

### Phase 4: Architecture (Low Priority)

#### 2.12 Lazy spaCy Loading
**File:** `main.py`

spaCy model loading is expensive (~1-2s). Move to module-level with a singleton pattern:

```python
_nlp = None

def get_nlp():
    global _nlp
    if _nlp is None:
        _nlp = spacy.load("en_core_web_sm")
    return _nlp
```

This is already done at module level in `phrase_extractor.py` but should be consistent across all files.

#### 2.13 Async Processing for Large Transcripts
**File:** `main.py`

For transcripts > 3000 words, process chunks in parallel using `concurrent.futures.ThreadPoolExecutor`:

```python
from concurrent.futures import ThreadPoolExecutor, as_completed

def process_chunks_parallel(chunks, segments, max_workers=4):
    all_phrases = []
    all_words = []
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(extract_phrases, chunk, segments): i
            for i, chunk in enumerate(chunks)
        }
        for future in as_completed(futures):
            all_phrases.extend(future.result())
    return all_phrases, all_words
```

**Note:** spaCy's `nlp()` releases the GIL for large texts, so threading can help. Need to verify with benchmarks.

---

## 3. Implementation Order

| Phase | Task | Estimated Effort | Risk |
|-------|------|-----------------|------|
| 1 | 2.1 Single NLP parse | 1 hour | Low |
| 1 | 2.2 Pre-computed freq map | 1 hour | Low |
| 1 | 2.3 Limit n-gram candidates | 30 min | Low |
| 2 | 2.4 Sentence-boundary filter | 30 min | Low |
| 2 | 2.5 Contraction expansion | 1 hour | Low |
| 2 | 2.6 Generic phrase filter | 30 min | Low |
| 2 | 2.7 Expand expressions | 1 hour | Low |
| 2 | 2.8 Entity filtering | 30 min | Low |
| 3 | 2.9 Frequency tiers | 30 min | Low |
| 3 | 2.10 Educational value | 30 min | Low |
| 3 | 2.11 Length penalties | 15 min | Low |
| 4 | 2.12 Lazy loading | 15 min | Low |
| 4 | 2.13 Parallel chunks | 1 hour | Medium |

**Total estimated effort:** ~8 hours

---

## 4. Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Processing time (10k words) | ~6-8s | < 3s |
| Garbage phrases in top 50 | ~5-8 | < 1 |
| Recognized expressions | 19 patterns | 60+ patterns |
| Cross-sentence phrases | ~20% of n-grams | 0% |
| Generic low-value phrases | ~30% of results | < 5% |

---

## 5. Files to Modify

| File | Changes |
|------|---------|
| `backend/nlp-server/main.py` | Single parse, parallel chunks |
| `backend/nlp-server/phrase_extractor.py` | Sentence boundary filter, entity filter, generic blacklist, n-gram limit |
| `backend/nlp-server/text_normalizer.py` | Contraction expansion |
| `backend/nlp-server/vocabulary_ranker.py` | Frequency tiers, educational bonus, length penalty |

---

## 6. Testing Strategy

1. **Unit tests** for each extractor with known inputs
2. **Regression test** with the 49-minute video (`Ga2HnYGI9qQ`) — compare top 50 before/after
3. **Performance benchmark** with 10k-word synthetic transcript
4. **Manual review** of top 50 results for junk phrases
