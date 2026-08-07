# Plan: Subtle attempt counter + reveal warning + card container style

## Goal
1) Unify the main GameCard container styling to the requested rose theme, and 2) add a per-card attempt counter plus a zero-attempt reveal guard in Real Mode.

## Current behavior
- Real Mode: user types answer → Validar → feedback → can Reveal
- No visible attempt count per card
- Reveal is immediate with no guard
- GameCard container uses dynamic cycle colors

## Proposed changes

### Container style
- Replace the dynamic cycle-colored outer container in `GameCard` with the requested fixed rose theme:
  - `w-full rounded-[2.5rem] shadow-[0_15px_45px_rgba(79,70,229,0.06)] border-4 p-5 md:p-6 text-center relative overflow-hidden min-h-[100px] flex flex-col justify-center transition-all duration-500 bg-rose-50 border-rose-500/20`
- Keep the feedback rings (`ring-8`) on top of this base container.

### Attempt counter
- Derive `attemptCount` in `GameView` from `attempts.filter(a => a.associationId === currentAssociation?.id).length`
- Pass `attemptCount` into `GameCard`
- Show a very subtle counter inside `GameCard`, below the definition label:
  - tiny text like `intentos: 0` in `text-[10px] text-slate-400 font-medium`
- Hide in practice mode if desired; keep visible in Real Mode.

### Reveal guard
- In `GameControls`, when Reveal is clicked in Real Mode and `attemptCount === 0`:
  - Do not reveal immediately
  - Show an inline warning/banner inside the card area with two actions:
    - “Intentar” → closes warning and focuses the answer input
    - “Revelar” → proceeds with reveal
- If `attemptCount > 0`, reveal works as today

## Files to touch
- `components/game/GameCard.tsx`
  - Update outer container classes to fixed rose theme
  - Add subtle attempt counter UI when `attemptCount` prop is provided
- `components/game/GameControls.tsx`
  - Add `attemptCount` prop
  - Add `onRevealWithZeroAttempts` callback prop for the warning state
- `components/GameView.tsx`
  - Derive `attemptCount`
  - Add local warning state `showRevealWarning`
  - Handle focus on input after “Intentar”
  - Pass new props to `GameCard` and `GameControls`

## Edge cases
- User switches cards: warning state resets
- User reveals after 0 attempts via warning “Revelar”: normal reveal path
- Practice mode: no reveal guard, counter optional/hidden
