# Plan: Finish GameControls rename + test fixes

## Goal
Complete the in-progress UI changes in `GameControls.tsx` (rename `Pasar` → `Siguiente`, add `Atrás` button, fix `Correcta` disabled state in practice mode), update the related test file to match, and commit/version-bump.

## Current State

**Already modified (uncommitted):**
- `src/components/game/GameControls.tsx` — added `Atrás` button, renamed `Pasar` → `Siguiente`, fixed `Correcta` disabled logic (no longer requires `wasRevealed`), grid is now `grid-cols-4`.
- `src/components/views/GameView.tsx` — passes `onPrev={actions.goBack}` and `canGoBack={gameState.currentIndex > 0}` to `GameControls`; also guards `isTransitioning` and the auto-advance `useEffect` with `!isEditingCard`.
- `AGENTS.md`, `package.json`, `src/constants/version.ts`, `src/hooks/app/useAppBootstrap.ts` — also modified in the working tree (treat as part of the same commit unless told otherwise).

**Verified clean:**
- `npx tsc --noEmit` shows no errors in `GameControls.tsx` or `GameView.tsx`.
- Remaining `tsc` errors are pre-existing (unused vars in `CardContent.tsx`, `CardFeedback.tsx`, `GameCard.tsx`, `CardBadges.tsx`, `CardVoiceIndicator.tsx`, `CardToolbar.tsx`) and not in scope.

**Broken because of the rename:**
- `tests/components/game/verification-buttons.test.tsx` — 4 failing tests + 1 broken import + missing new required props in helpers.

## Required Edits (implementation agent)

### 1. `tests/components/game/verification-buttons.test.tsx`

**a. Fix broken import (line 4):**
```ts
import { GameMode } from '@//types';
```
→
```ts
import { GameMode } from '@/types';
```

**b. Add new required props to all three `renderControls` helpers** (lines ~26-37, ~114-125, ~179-189):
Each helper must pass:
```tsx
onPrev={vi.fn()}
canGoBack={false}
```

**c. Replace `/pasar/i` → `/siguiente/i`** in 3 places (lines 43, 59, 131).

**d. Update the "exactly 3 buttons in real mode" test (line 81-90):**
Rename to `should show exactly 4 buttons in real mode: Atrás, Siguiente, Validar, Revelar`. Expect length 4, and add an `Atrás` assertion:
```tsx
expect(screen.getByRole('button', { name: /atrás/i })).toBeInTheDocument();
```

### 2. (Optional but recommended) Add a test for `Atrás`

If scope allows, add a small test inside each `describe` block that asserts:
- `Atrás` button is rendered and disabled when `canGoBack={false}`.
- `Atrás` button is enabled when `canGoBack={true}`.

This is optional and can be deferred.

### 3. Version bump (AGENTS.md rule 29)

These changes are UI features → **minor bump** (y+1), e.g. `1.16.0` → `1.17.0`. (Check current version in `src/constants/version.ts` before bumping.)

Update BOTH files:
- `src/constants/version.ts` → `APP_VERSION = 'x.y.z'`
- `package.json` → `"version": "x.y.z"`

### 4. Commit

Stage only the intended files (verify with `git diff --stat` and `git status`). Suggested message:

```
feat: rename Pasar to Siguiente, add Atrás button in GameControls (v1.17.0)
```

(or whichever version was chosen). Push/commit per user instruction only — never auto-commit.

## Risks / Caveats

- The pre-existing `tsc` errors in CardContent/CardFeedback/etc. will remain; out of scope.
- The test file imports `GameControls` via `@/components/game/GameControls` — verified it resolves at runtime via vitest path alias; the `tsc` "Cannot find module" error for it is a pre-existing tsconfig issue, not related to these changes.
- AGENTS.md and package.json/version.ts/useAppBootstrap.ts modifications from the previous session should be reviewed by the user before commit to confirm they belong in the same change set.

## Validation

1. `npx tsc --noEmit 2>&1 | grep -E "GameControls|GameView"` → no errors.
2. `npx vitest run tests/components/game/verification-buttons.test.tsx` → all 17 tests pass.
3. (Optional) `npm run lint` if a lint script exists.
4. Manual smoke test in app: practice mode shows Atrás / Siguiente / Revelar / Correcta; real mode shows Atrás / Siguiente / Validar / Revelar; Atrás is disabled on first card.

## Out of Scope

- Fixing pre-existing unused-variable errors in other Card* components.
- Refactoring `PracticeModeControls` (it already uses icon-only back arrow — user accepted as-is).
- Renaming keyboard shortcuts or engine actions.