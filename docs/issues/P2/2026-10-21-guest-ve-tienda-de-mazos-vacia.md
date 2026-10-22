# Guest sees an empty deck store (catalogue short-circuits to [])

**Date:** 2026-10-21
**Status:** Not fixed
**Source:** `docs/audits/2026-10-20-usability-gaps.md` §5 (U-17)

## What

A visitor who chooses "Continue as guest" — the lowest-friction path the landing offers — gets a dashboard with no catalogue: `prebuiltDeckService.fetchDecks` returns `[]` for guests, `quotaService.fetchQuota` returns `null`, and the YouTube import is unavailable (backend calls require a real uid per `AGENTS.md` §31).

## Impact

- The value proposition ("start free, in seconds") fails at the exact point where friction was removed: the guest sees an empty product instead of a starter catalogue.
- It suppresses guest → signup conversion, which is the funnel step the landing is built to produce (`market-positioning.md` §6.1, steps 3-4).
- Support-shaped confusion ("is the app broken?") with no in-product explanation.

## Evidence

```
$ sed -n '10,16p' src/services/prebuiltDeckService.ts
    if (!user || user.uid === GUEST_UID) {
      console.log('[prebuiltDeckService] guest session: returning empty catalog');
      return [];
    }

$ sed -n '74,82p' src/services/quotaService.ts
  fetchQuota: async (userId: string): Promise<UserQuota | null> => {
    if (!userId || userId === 'anonymous' || userId === GUEST_UID) return null;
```

`docs/audits/2026-10-20-usability-gaps.md` §5. Note: the empty-catalogue behaviour itself is a deliberate §31 short-circuit (see `done/2026-10-13-prebuiltdeck-sin-guard-guest.md`); the defect is that the guest UI does not substitute anything.

## Fix

Serve a static, bundled subset of prebuilt decks to guests (no Cloud Function call, honouring §31 Rule 0), or make the guest banner state clearly what is unavailable and why. Keep all guest data in `localStorage` via `gameStore` (§31).
