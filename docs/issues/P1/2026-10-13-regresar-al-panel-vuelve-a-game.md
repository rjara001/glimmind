# "Regresar al panel" returns to /game on the first play of a session

**Date:** 2026-10-13
**Priority:** P1
**Status:** Not fixed

## What

`navigate("game")` is called twice on the first play of a session: once by the
bootstrap auto-nav effect and once by `handlePlayList`. Both calls push the
current view onto the navigation history stack. After the second push the stack
is `['dashboard', 'game']`, so `goBack()` pops `'game'` as its target and the
user is sent back to `/game` instead of `/dashboard`.

## Impact

Every guest or signed-in user who finishes their first session of the day and
taps "Regresar al panel" stays on the game screen. There is no visible way back
to the dashboard other than the Navbar "Dashboard" button, which the E2E specs
work around by clicking it directly.

## Evidence

```
src/hooks/app/useAppHandlers.ts:127-136   handlePlayList calls navigate("game")
src/hooks/app/useAppBootstrap.ts:66-77    auto-nav effect also calls navigate('game')
src/hooks/app/useNavigation.ts:23-35      navigate always pushes the current view
src/hooks/app/useNavigation.ts:37-46      goBack pops the last pushed view
src/components/game/FinishedScreen.tsx:157-163  "Regresar al panel" button
```

Reproduction (from `e2e/03-game-real.spec.ts` and `e2e/04-game-practice.spec.ts`):
1. Log in as guest, create a deck, click Study.
2. Bootstrap auto-nav fires `navigate('game')` (pushes `dashboard`).
3. `handlePlayList` fires `navigate('game')` again (pushes `game`).
4. Finish the session, click "Regresar al panel".
5. URL stays on `/game` instead of returning to `/dashboard`.

## Fix

In `useNavigation.navigate`, skip the history push when `nextView === view`
(no-op navigation). Alternatively, guard the bootstrap auto-nav with a
`didAutoNavigate` ref check *before* calling `navigate`, which already exists
but is set only after the call — move the ref assignment ahead of the
`navigate` call so a concurrent `handlePlayList` cannot double-push.
