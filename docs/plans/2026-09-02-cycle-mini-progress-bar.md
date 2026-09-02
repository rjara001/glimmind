# Plan: Cycle Mini Progress Bar (mid-game indicator)

Date: 2026-09-02
Status: Draft (revised after user feedback)

## Goal

While the user is playing a deck in any active cycle (NUEVA, VISTA, RECONOCIDA, FRECUENTE), show a compact "mini-bar" bag that tracks progress through the **current cycle only**: pending vs. correct in that cycle, with a progress fill that updates as the user answers.

This is **not** the global breakdown shown by `CycleProgress` (which shows all 4 cycles + aprendidas). It is a smaller, focused widget for the current cycle queue.

## Current state

- `src/components/game/CycleProgress.tsx` renders a 4-cycle + aprendidas breakdown (mobile + desktop variants). It currently defines `CYCLE_LABELS` and `STATE_COLORS` locally.
- `gameplay.cycleStats` (in `useGameViewGameplay.ts:108-111`) exposes global `{ pending, correct }`, not per-cycle.
- Cycles are `1..4` (`GameCycle`).

## Scope (focused on the bag element)

From the reference HTML, the bag element contains:

1. Top row: `⏳ <pending> pend.` (slate) and `✅ <correct> corr.` (green).
2. Mini progress bar (4px height, slate track, green fill, animated width).
3. Name label (uppercase, slate), e.g. `VISTA`.

Excluded (per user instruction):

- Page container, title/subtitle.
- Controls (Correct / Incorrect / Reset buttons).
- Status footer.
- Flash animations (the bag is informational; the engine already triggers correct/incorrect effects).

The mini-bar will be reactive (updates on each correct/incorrect without page reload), but it will **not** trigger any effect itself.

## Visual design

Match the reference styles but adapted to the project's Tailwind tokens:

- Container: vertical flex, centered, padding `12px 16px 10px`, radius `14px`, max-width `~180px`, border `2px solid #2563eb` (active cycle), background per active cycle (from shared `CYCLE_COLORS`).
- Top row: `flex justify-between`, text `0.7rem` slate / emerald.
- Mini-bar: `w-full h-1`, track `#e2e8f0`, fill `#059669`, transition `width 500ms ease`.
- Name: `0.65rem` uppercase, slate, top border, full width. Shows `✅ VISTA` when cycle is complete.

## Shared constants (decision: extract to `src/utils/cycle-colors.ts`)

To avoid coupling `CycleMiniBar` to `CycleProgress` (potential circular dependency, unclear ownership), extract the shared constants:

```ts
// src/utils/cycle-colors.ts
export const CYCLE_LABELS: Record<number, string> = {
  1: 'NUEVA',
  2: 'VISTA',
  3: 'RECONOCIDA',
  4: 'FRECUENTE',
};

export const CYCLE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  nueva:      { bg: '#f0f4fe', border: '#c7d9f0', text: '#1a2b3c' },
  vista:      { bg: '#fef7e6', border: '#f0e0b8', text: '#1a2b3c' },
  reconocida: { bg: '#fce8e8', border: '#f0c8c8', text: '#1a2b3c' },
  frecuente:  { bg: '#f0eaf8', border: '#d8cce8', text: '#1a2b3c' },
};

export function cycleToColorKey(cycle: number): keyof typeof CYCLE_COLORS {
  switch (cycle) {
    case 1: return 'nueva';
    case 2: return 'vista';
    case 3: return 'reconocida';
    default: return 'frecuente';
  }
}
```

Then **refactor `CycleProgress.tsx` to import from this module** (delete the local `CYCLE_LABELS` and `STATE_COLORS`, replace usages). The shape of `STATE_COLORS` in `CycleProgress.tsx` is identical to `CYCLE_COLORS` plus a `badge` field. We can either:

- **Option A (preferred):** Use the shared `CYCLE_COLORS` and define the `badge` palette locally in `CycleProgress.tsx` (it's only used in the expanded sidebar of `CycleProgress`, not the mini-bar).
- **Option B:** Add `badge` to the shared object.

Going with **Option A** to keep the shared object minimal.

## Per-cycle counting (decided)

The engine marks an item `status: "correct"` when the user acerta, and `currentCycle` only increments on fail (see `gameEngine.ts:423-443`). So the per-cycle deltas are:

- `total` = count of associations with `currentCycle === globalCycle` (the size of the active cycle bucket before the run started; it doesn't change as the user answers, since acerts keep `currentCycle` and fails bump it to the next cycle).
- `correct` = count of associations with `currentCycle === globalCycle` AND `status === "correct"` (or `isLearned === true` for **all** cycles, not just cycle 1 — see clarification below).
- `pending` = `total - correct`.

### Clarification: ciclo 1 (NUEVA) and `isLearned`

In cycle 1, an acert sets `isLearned = true` (see `gameEngine.ts:427`). A user-correct answer in any cycle should count toward the mini-bar "correct" counter — the user acertó in the current cycle. So `correct` includes both `status === "correct"` and `isLearned === true` for any cycle:

```ts
const correct = inCycle.filter(a =>
  a.status === "correct" || a.isLearned === true
).length;
```

### Behavior on a fail (VISTA → RECONOCIDA)

When the user fails in cycle 2, the item's `currentCycle` becomes 3, so it is **no longer** in `inCycle` (which filters by `currentCycle === globalCycle === 2`). Result: both `total` and `correct` decrease by 1, and `pending` stays the same. This is intentional — the mini-bar tracks "how many items remain to validate in this cycle," and a failed item has left the bag.

## Edge cases

| Case | Behavior |
|---|---|
| `total === 0` | Bar at 0% width, show `0 / 0` (pending 0, correct 0). |
| `correct === 0` | Bar at 0% width, pending only. |
| `correct === total` | Bar at 100% width, emerald full, label shows `✅ VISTA`. `isComplete` derived in parent (`pending === 0`). |
| Cycle just transitioned | Bag label updates to the new cycle; counts reflect the new cycle's bucket. |
| `isComplete` | Border switches from blue (`#2563eb`) to emerald (`#059669`); label gains `✅` prefix. |

The component accepts `isComplete` as an optional prop; the parent derives it from `pending === 0` (and the cycle still being active).

## Component design

New file: `src/components/game/CycleMiniBar.tsx`

```ts
interface CycleMiniBarProps {
  cycle: GameCycle;
  pending: number;
  correct: number;
  total: number;
  isComplete?: boolean;
}
```

Computed inside the component:

- `label = CYCLE_LABELS[cycle]`
- `colors = CYCLE_COLORS[cycleToColorKey(cycle)]`
- `pct = total > 0 ? (correct / total) * 100 : 0`

Type placement: `src/types/cycle-mini-bar-props.ts` (per AGENTS.md rule 7).

## Wiring

- Add a memoized per-cycle derivation in `useGameViewGameplay.ts`:
  ```ts
  const cycleMiniStats = useMemo(() => {
    const cycle = gameState.globalCycle;
    const inCycle = gameState.associations.filter(a => a.currentCycle === cycle);
    const correct = inCycle.filter(
      a => a.status === "correct" || a.isLearned === true
    ).length;
    return {
      pending: inCycle.length - correct,
      correct,
      total: inCycle.length,
      isComplete: inCycle.length > 0 && inCycle.length - correct === 0,
    };
  }, [gameState.associations, gameState.globalCycle]);
  ```
- Pass these to the new `CycleMiniBar` from `GameView.tsx` and `CardStage.tsx` (mobile path) near the existing `CycleProgress` placement.

## Consistency with `CycleProgress`

`CycleProgress` shows the **global** distribution (4 cycles + aprendidas). `CycleMiniBar` shows **current cycle only** (pending vs correct). They are complementary, not redundant: the user sees the bag focused on what they're playing right now, and can expand `CycleProgress` for the full picture.

## Files to add / change

Add:

- `src/components/game/CycleMiniBar.tsx`
- `src/types/cycle-mini-bar-props.ts`
- `src/utils/cycle-colors.ts`

Modify:

- `src/components/game/CycleProgress.tsx` — remove local `CYCLE_LABELS` and `STATE_COLORS`, import from `src/utils/cycle-colors.ts`. Keep the local `badge` palette. **Pure refactor, no behavior change.**
- `src/hooks/game/useGameViewGameplay.ts` — add `cycleMiniStats` memo.
- `src/components/views/GameView.tsx` — render `CycleMiniBar` near the existing `CycleProgress` when `!isMobile`.
- `src/components/views/game/CardStage.tsx` — render `CycleMiniBar` in the mobile path.

## Non-goals

- No flash/celebration animations in the mini-bar.
- No Levenshtein / similarity feedback inside the mini-bar.
- No behavior change in `CycleProgress` (only the constant-extraction refactor).
- No new tracking fields on `Association`; the existing `currentCycle` + `status` + `isLearned` are sufficient.

## Validation

- Type-check: `npx tsc --noEmit` (or the project's equivalent script).
- Manual: start an emulated session, answer cards in cycle 1, confirm mini-bar `correct` increments and fill width grows; advance to cycle 2, confirm label switches to `VISTA` and counts reflect the new cycle bucket; force a fail in cycle 2, confirm the failed item disappears from the VISTA bag.
- Responsive: confirm the bag stays within its `max-width` and does not overflow on mobile widths (<400px).
- Regression: open `CycleProgress` and confirm the visual is identical to before the constant extraction.
