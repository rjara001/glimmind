# MultiValue Bidirectional Engine Controller

**Date:** 2026-08-30
**Status:** Proposed

## Context

The game spec requires a memory/vocabulary engine that validates user answers
against a **bidirectional dictionary** of `Key / Multivalor` pairs:

```text
Key (EN):    "I'm down"
Multivalor (ES): ["Estoy de acuerdo", "Me copa"]
```

The spec is engine-level only: it defines a turn-based controller that must
(a) normalize input, (b) validate against all accepted renderings of the current
prompt, (c) maintain a remaining-count of `n - 1` undiscovered answers per card,
and (d) emit a structured JSON turn (`EngineTurn`) that the UI renders.

The current codebase cannot satisfy this out of the box:

1. `src/utils/flattenAssociations.ts` **destroys the multivalor structure** on
   every ingest path (split into 1:1 cards with brand-new UUIDs).
2. `GlimmindGame` (`src/services/gameEngine.ts`) validates **1:1** against a
   single `term`/`definition` using a similarity threshold, with no notion of
   multiple accepted answers per card.
3. There is no per-turn disclaimer/prompt state (`[ X / N expected answers ]`)
   anywhere in the UI.
4. There is no `DIRECT | INVERSE` mode enum; direction today is `flipOrder:
   'normal' | 'reversed'`.

## Goals

- Keep a `Key -> Multivalor` association as **one card with N answers** instead
  of flattening it into N cards.
- Add a mode dimension `DIRECT | INVERSE` that composes with the existing
  `flipOrder`.
- Produce the spec's `EngineTurn` JSON per user turn.
- Keep progression (next card, cycle, completion) in the parent
  (`GameView`), per AGENTS.md rule 28. The controller never advances itself.

## Design Decisions

### 1. Preserve Multivalor At Ingest (before flattening)

The multivalor values already arrive slash-separated in raw sources (e.g.
`respaldo-all-words`: `term` or `definition` = `"A/B/C"`). That structure must be
captured **before** `flattenAssociations` runs.

Add an optional field to `Association`:

```typescript
interface Association {
  // existing fields...
  multivalues?: string[]; // accepted renderings; when present, term is the Key
}
```

New util `src/utils/multivalueParser.ts`:

- Reads `rawSourceText` / `sourceRow` line-pairs, and for rows where either side
  is slash-separated, emits one `Association` with `multivalues` populated.
- Such associations are **excluded** from `flattenAssociations` (a skip guard in
  the flatten util checks `association.multivalues`).

Ingest touch points to update: `src/components/ListEditor.tsx` (cleanupAndSave),
`src/components/views/Dashboard.tsx` (CSV/file import), and
`src/store/gameStore.ts` (`flattenList`/`applyFlattening`) so the guard is applied.

### 2. Merge Repeated-Term Rows (existing multivalue-as-rows)

Legacy/imported data often represents the multivalue as **repeated rows** that
share the same term (Key) with different definitions:

```text
"I'm down" | "Estoy de acuerdo"
"I'm down" | "Me copa"
```

`mergeRepeatedTermAssociations` (in `src/utils/multivalueParser.ts`) groups rows
by a case-insensitive, trimmed term into a single DIRECT card with `multivalues`:

- Only single-term rows participate; multi-term (`A/B`) rows are left to `flattenAssociations`.
- Existing `multivalues` on a row fold into the group.
- Repeated definitions are deduplicated.
- The merged card **resets progress** (new id, pending, cycle 1) per product decision.
- Archived rows never merge and pass through unchanged.

The merge runs **after** `captureMultivaluesForMany` and **before**
`flattenAssociations` at every ingest/migration touch point (`ListEditor`,
`Dashboard` bulk/file import, `gameStore` `flattenList`).

### 3. New Controller Service (pure, testable)

`src/services/engineController.ts` — a reusable, stateless (or immutable) engine
following the `GlimmindGame` immutable-reducer style. It owns:

- `startCard(key, multivalues, mode): EngineCardState`
- `evaluate(cardState, rawInput): EngineTurn`
- `normalizeInput(input): string` (shared normalization)

Normalization reuses the existing logic in `src/services/gameEngine.ts`
(lowercase, NFD strip accents, punctuation removal), extracted so both engines
share it.

```typescript
export type EngineMode = 'DIRECT' | 'INVERSE';

export interface EngineCardState {
  cardId: string;
  mode: EngineMode;
  promptWord: string;
  expectedCount: number;   // N (DIRECT) or 1 (INVERSE)
  foundAnswers: string[];
  remainingCount: number;  // n - 1
  isCompleted: boolean;
}

export interface EngineTurn {
  card_id: string;
  mode: EngineMode;
  prompt_word: string;
  disclaimer: string;            // "X / N expected answers"
  is_correct: boolean;
  found_answers: string[];
  remaining_count: number;
  is_completed: boolean;
  system_message: string;
}
```

Behavior:

- **DIRECT** (`Key` shown, find all `Multivalor`): `N = multivalues.length`.
  A correct answer marks that rendering discovered, decrements `remaining_count`,
  and never re-accepts a repeated answer.
- **INVERSE** (one `Multivalor` rendered, find the `Key`): `N = 1` by default
  (inverse relation is 1:1). `expectedCount = 1`.
- **Incorrect:** returns `is_correct: false`, keeps counters, returns a retry
  `system_message`.
- **Completed:** when `remaining_count === 0`, `is_completed: true` and the
  system_message requests moving to the next card. Progression is delegated to
  the parent hook/component.

### 4. Mode Composition

`EngineMode` is a third dimension layered on top of the existing `flipOrder`:

| flipOrder | EngineMode | prompt | expected answers |
|-----------|-----------|--------|------------------|
| normal    | DIRECT    | Key (term) | all Multivalor (N) |
| reversed  | INVERSE   | one Multivalor | the Key (1) |

When a card has **no** `multivalues` (legacy 1:1 data), the controller falls back
to current behavior: `N = 1` in either mode, so older lists keep working.

### 5. UI Wiring

- New hook `src/hooks/game/useEngineController.ts` (modeled on
  `useGameEngine.ts` / `useGameLogic.ts`) that holds `EngineCardState` via
  `useState`/`useReducer` and exposes `evaluateAnswer(input)`.
- **Parent-owned progression** (AGENTS.md 28): `GameView` decides
  `handleNextCard()` and resets the card state; the hook never advances on its
  own or on timeouts.
- `GameCard` renders the disclaimer `[ X / N expected answers ]` from
  `engineTurn.disclaimer` and shows the retry/correct/completed feedback.
- The spec's JSON field names (`card_id`, `prompt_word`, ...) map 1:1 to
  `EngineTurn` properties so the controller output is directly renderable.

### 6. Tests

`tests/services/engineController.test.ts` following the existing
`tests/services/gameEngine.test.ts` patterns (AAA):

- DIRECT: all `N` renderings found in any order; duplicates don't double-count.
- DIRECT: wrong answer keeps remaining_count unchanged.
- INVERSE: the key matches; mode flips normalization direction.
- Normalization: case, accents, punctuation-insensitive matching.
- Completion boundary: `remaining_count` reaches 0 exactly on the last hit.
- Legacy 1:1 cards behave as `N = 1` in both modes.

## Files Changed

### New files

- `src/services/engineController.ts` — the controller (spec engine).
- `src/services/types-engine...` → types live in `src/types/` per AGENTS.md rule 7
  (see below).
- `src/utils/multivalueParser.ts` — capture multivalor before flattening; also
  hosts `mergeRepeatedTermAssociations` (repeated-row grouping).
- `src/hooks/game/useEngineController.ts` — hook wrapper for the controller.
- `tests/services/engineController.test.ts` — unit tests.
- `tests/utils/multivalueParser.test.ts` — tests for capture + repeated-row merge.

### Modified files

- `src/types/engine.ts` (new) — `EngineMode`, `EngineCardState`, `EngineTurn`.
- `src/types.ts` — add `multivalues?: string[]` to `Association`.
- `src/services/gameEngine.ts` — extract `normalizeString` to a shared util;
  keep `GlimmindGame` untouched otherwise.
- `src/utils/flattenAssociations.ts` — skip associations that already carry
  `multivalues`.
- `src/components/ListEditor.tsx`, `src/components/views/Dashboard.tsx`,
  `src/store/gameStore.ts` — apply the multivalue parser + repeated-row merge /
  flatten guard at ingest and migration.
- `src/components/views/GameView.tsx`, `src/components/GameCard.tsx` — wire mode,
  disclaimer banner, and parent-controlled progression.

## Out of Scope

- Writing code for the plan itself; this branch only delivers the plan.
- Voice/STT integration in the engine evaluation (answer text flows from the
  normalized typed/SPT input the parent already produces).

## Conventions

- All code, comments, docs, and commits in English (AGENTS.md rule 1).
- Types in `src/types/` or `src/types.ts` — never inside components.
- Progression owned by parents; children only render feedback and call
  `on` callbacks.
- On future merge to `main`, bump `APP_VERSION` in `src/constants/version.ts`
  and `package.json` (AGENTS.md rule 29).