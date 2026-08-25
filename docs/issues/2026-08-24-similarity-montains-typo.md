# Similarity Scoring — "mountain" vs "montains" Yields 90%, Below 95% Threshold

Date: 2026-08-24
Status: Root cause identified — data typo in the stored expected answer
Scope: Answer scoring in `src/services/gameEngine.ts` (`calculateSimilarity`, `calculateLevenshteinDistance`, `normalizeString`)

## Symptom

A user answered with:

- **User input:** `if we lived in the mountain`
- **Expected (stored):** `If we lived in the montains`
- **Computed similarity:** `90%`
- **Threshold:** `95%`
- **Result:** Incorrect (below threshold)

At a glance the expected value appears to differ from the user's answer only by a
trailing `s`. Intuition suggests the score should be near 95% and therefore pass.
Instead it scored 90% and failed.

## Root Cause

### 1. The stored expected answer contains a typo

The expected value is spelled **`montains`** (missing the `u`), not `mountains`. The
user wrote `mountain` correctly. Comparing `mountain` vs `montains`, the optimal
Levenshtein alignment is **not** a single trailing `s`:

```
mountain   →  m o [u] n t a i n
montains   →  m o  n  t a i n [s]
```

This is **2 edits**: delete the `u` and insert the `s` (a transposition-style shift, not
a one-character substitution). That is why the score is not ~95% but materially lower.

### 2. Why the score is exactly 90%

The list has `ignoreArticles = true`. In `normalizeString` (`gameEngine.ts:48`),
function words from `IGNORED_WORDS` are stripped. That set includes **`in`** and
**`the`**, so the strings actually compared are:

- user: `if we lived mountain`  → length **20**
- expected: `if we lived montains` → length **20**

`calculateSimilarity` (`gameEngine.ts:93`) uses a length-normalized Levenshtein ratio:

```typescript
const distance = calculateLevenshteinDistance(aNormalized, bNormalized); // 2
const longerLength = Math.max(aNormalized.length, bNormalized.length);   // 20
const similarity = (1 - distance / longerLength) * 100;                  // (1 - 2/20)*100
```

```
similarity = (1 - 2 / 20) * 100 = 90%
```

## Verification

The exact algorithm was reproduced against both spellings of the expected value:

| Expected spelling        | `ignoreArticles` | Distance | Max length | Similarity |
| ------------------------ | ---------------- | -------- | ---------- | ---------- |
| `montains` (typo)        | `true`           | 2        | 20         | **90%** ❌ |
| `mountains` (correct)    | `true`           | 1        | 20         | **95%** ✅ |

With the correctly spelled expected answer (`mountains`), the only difference is the
trailing `s`, the distance is 1, and the score lands exactly on the 95% threshold and
**passes**.

## Conclusion

The 90% result is not a bug in the similarity engine. The root cause is that the
**stored association's expected answer is misspelled (`montains`)**. Correcting the data
to `mountains` makes the user's legitimate `mountain` pass at 95%.

## Design Note (optional, non-blocking)

Even with correct data, the metric is sensitive on short phrases: each character costs
~5% of the score over a length of 20. Additionally, because `in` is part of
`IGNORED_WORDS`, the denominator shrinks, amplifying per-character penalties. If "only a
trailing `s` is missing" should be more forgiving, candidates include:

- Token/word-level comparison instead of character-level, or
- A token-based metric (Jaccard / cosine over words), or
- A small fixed character-tolerance margin in addition to the percentage threshold.

The immediate action, however, is to fix the `montains` typo in the data.
