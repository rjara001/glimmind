# Unify Game Engine: Levenshtein MultiValue Validation + Percentage Toast

**Date:** 2026-08-31
**Status:** Implemented

## Context — Why this exists

Earlier refactors introduced a *second, parallel* game engine (`engineController`)
for MultiValue (`Key -> Multivalor`, `definition: string[]`) support. It was wired
into the UI alongside the original engine (`GlimmindGame`) behind a boolean flag
named `isEngineActive`.

This created two competing validation flows in `GameView`:

1. **Legacy `GlimmindGame.checkAnswer()`** — validates a **single** answer
   (`definition[0]`) using Levenshtein similarity + threshold, records `attempts`,
   `feedback`, `similarity`, and fires the **percentage toast** (obtained vs.
   expected threshold).
2. **`engineController.evaluateTurn()`** — validates against **all** `expectedAnswers`
   (N in DIRECT mode, 1 in INVERSE) using **exact normalized matching only** (no
   Levenshtein, no threshold), tracks `foundAnswers`/`remainingCount`/`isCompleted`,
   but does **not** record attempts, similarity, or progress. Its toast is the
   generic `system_message` with **no percentage**.

Because `isEngineActive` is effectively always true (any card with definitions),
the **percentage toast and similarity feedback never appeared in real play**, even
though the user-facing spec (`glimmind-engine.md`) requires them.

### Design decision

The percentage display was **never meant to be removed**. Similarity scoring via
Levenshtein must keep working in the new MultiValue engine.

The correct model is **not** "legacy vs. engine" — the MultiValue engine is the
*only* engine. It must evaluate the user's input by computing Levenshtein
similarity against **every** accepted meaning in the array and selecting the
**closest match**.

## Goals

- Make `GlimmindGame` the **single authoritative engine** (it already owns
  progression: cycles, active queue, attempts, summary).
- Evaluate input with **Levenshtein similarity against all `expectedAnswers`**,
  choosing the best (highest) match.
- **Restore the percentage toast** using that best match (obtained vs. required
  threshold).
- **Remove** the `isEngineActive` flag, the duplicated flows,
  `engineController.ts`, and `useEngineController.ts`.

## Design

### 1. Engine state additions (`src/types.ts`)

Add optional MultiValue fields to `GameState` so `GlimmindGame` can track the
per-card discovery state previously owned by `engineController`:

```typescript
export type EngineMode = 'DIRECT' | 'INVERSE';

interface GameState {
  // ...existing fields
  mode?: EngineMode;          // DIRECT (show Key, find N) | INVERSE (show one, find Key)
  expectedAnswers?: string[]; // accepted renderings for the current card
  expectedCount?: number;
  foundAnswers?: string[];    // already discovered renderings
  remainingCount?: number;    // expectedCount - foundAnswers.length
}
```

### 2. Unified evaluation in `GlimmindGame.checkAnswer()` (`src/services/gameEngine.ts`)

Replace the current single-answer comparison (`definition[0]`) with MultiValue
similarity evaluation:

1. Determine `expectedAnswers` by mode:
   - **DIRECT** (`flipOrder: 'normal'`): `current.definition` (all N meanings).
   - **INVERSE** (`flipOrder: 'reversed'`): `[current.term]` (the Key, N = 1).
2. Compute Levenshtein similarity (reusing `calculateSimilarity` + `normalizeAnswer`,
   honoring `ignoreArticles`) against **each** `expectedAnswer`.
3. Pick the **best match** (highest similarity) and its index.
4. `similarity` = that best percentage; `expectedAnswer` = the matched rendering.
5. `isCorrect` when the best similarity `>= threshold` (or normalized equality = 100%).
6. If correct and that rendering is not yet in `foundAnswers`, add it and decrement
   `remainingCount`.
7. Record the `attempt` (with the best-match similarity) so `AttemptList` /
   `AttemptAnalysisModal` keep working.
8. Set `mode`, `expectedAnswers`, `expectedCount`, `foundAnswers`, `remainingCount`
   on state for the UI disclaimer.

**DIRECT progression:** the game does not mark the card fully correct / auto-advance
until `remainingCount === 0` (all N renderings discovered). Parent controls advance
(AGENTS.md rule 28).

### 3. Restore percentage toast in UI (`src/components/views/GameView.tsx`)

Remove the engine-vs-legacy branching and keep a **single** percentage toast that
fires from the unified `feedback`/`similarity`/`lastAttempt`/`expectedAnswer`:

- Correct: `Correct! {lastAttempt} → {expectedAnswer} (100% similarity, needed {threshold}%)`
- Incorrect: `Incorrect. You wrote: "{lastAttempt}" | Similarity: {similarity}% | Needed: {threshold}%`

### 4. Remove the duplicated machinery

- Delete `src/services/engineController.ts`, `src/hooks/game/useEngineController.ts`.
- Slim `src/types/engine.ts` to just `EngineMode` (or fold `EngineMode` into
  `src/types.ts`); remove `EngineTurn`, `EngineCardState`, `EngineEvaluationResult`
  if unreferenced after the refactor.
- `GameCard`: derive the disclaimer (`X / N expected answers`) and `foundAnswers`
  chips from the unified `gameState` instead of `engineDisclaimer`/`engineFoundAnswers`.
- `feedback`, `similarity`, `lastAttempt` are no longer forced to `null` in engine mode.

### 5. Voice consistency (secondary)

`useGameVoice.ts`, `useVoiceSession.ts`, and `VoiceGameView.tsx` currently assume a
single expected answer via `definition[0]` for narration and STT evaluation. They
are kept as-is unless the unified engine requires the expected answer; the primary
goal is the game engine and toast, not a voice rewrite.

### 6. Tests

- Port `tests/services/engineController.test.ts` into
  `tests/services/gameEngine.test.ts`, adapting exact-match expectations to **fuzzy**
  Levenshtein selection against N renderings (e.g. `"Estoy de acue"` matches
  `"Estoy de acuerdo"`).
- Keep/adapt existing `gameEngine.test.ts` similarity cases (they use
  `definition[0]` which is still valid for N=1 lists).
- Leave `tests/components/verification-toast.test.tsx` as-is (it tests the Toast
  provider, not the message source).

## Files Changed

### New
- `docs/plans/2026-08-31-unify-engine-levenshtein-multivalue.md` (this plan)

### Modified
- `src/types.ts` — add `EngineMode` + MultiValue fields to `GameState`.
- `src/services/gameEngine.ts` — MultiValue Levenshtein evaluation + state.
- `src/components/views/GameView.tsx` — remove flag, single percentage toast.
- `src/components/game/GameCard.tsx` — disclaimer/foundAnswers from gameState.
- `src/types/engine.ts` — reduce to `EngineMode` (or remove file).
- `tests/services/gameEngine.test.ts` — port MultiValue + Levenshtein cases.
- `src/constants/version.ts` and `package.json` — bump to **1.16.0** (AGENTS.md rule 29).

### Removed
- `src/services/engineController.ts`
- `src/hooks/game/useEngineController.ts`

## Out of Scope

- Changing the voice STT provider or its single-answer assumption (only noted).
- Rewriting the progression/cycle system.

## Conventions

- All code, comments, docs, commits in English (AGENTS.md rule 1).
- Types in `src/types()` — never inside components (AGENTS.md rule 7).
- Progression owned by parents; children only render feedback (AGENTS.md rule 28).
- Bump `APP_VERSION` and `package.json` on merge to main (AGENTS.md rule 29).
