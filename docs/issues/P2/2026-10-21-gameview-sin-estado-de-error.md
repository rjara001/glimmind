# GameView has no deck-load error state

**Date:** 2026-10-21
**Status:** Not fixed
**Source:** `docs/audits/2026-10-20-usability-gaps.md` §3 (U-12)

## What

Three distinct situations render identically: deck still loading, deck empty, deck failed to load. `src/App.tsx` shows a spinner ("Loading deck...") whenever `currentList` is absent, and `src/components/views/GameView.tsx` shows a plain "Loading..." whenever `currentAssociation` is absent. Neither component can represent an error, so a corrupted or oversized deck produces an infinite spinner with no retry, no error message and no exit other than the navbar.

## Impact

- A load failure is indistinguishable from a slow load, so the user waits forever instead of retrying or going back.
- It is the last silent-failure path in the product (`usability-gaps.md` §8, order 7).
- Any future deck-size or network work will surface as "the app hangs on the game screen".

## Evidence

```
$ sed -n '314,323p' src/App.tsx
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-8 h-8 animate-spin ...">...
                      <span className="text-sm text-slate-400">Loading deck...</span>

$ sed -n '287,293p' src/components/views/GameView.tsx
  if (!currentAssociation) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }
```

`docs/audits/2026-10-20-usability-gaps.md` §3: "Three distinct situations render identically."

## Fix

Add a `deckStatus: 'idle' | 'loading' | 'error' | 'ready'` slice to `gameStore`, set `error` on deck-load failure, render an error state with `Retry` and `Back to dashboard`, and keep the spinner for `loading` only. Per `AGENTS.md` §29 the status lives in the parent (`GameView`/store); `GameCard` stays display-only.
