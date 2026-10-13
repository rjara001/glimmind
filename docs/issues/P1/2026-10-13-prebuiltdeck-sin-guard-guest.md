# prebuiltDeckService has no guest guard, trapping guests in DeckStoreOnboarding

**Date:** 2026-10-13
**Priority:** P1
**Status:** Not fixed

## What

`prebuiltDeckService.fetchDecks` calls `callFunction('getPrebuiltDecks', {})`
directly with no `GUEST_UID` short-circuit. For a guest (no Firebase auth
session) the Cloud Function call fails, and `DeckStoreOnboarding` renders its
error state with only a "Reintentar" button and no dismiss action, so the
guest is stuck in a loop.

Per AGENTS.md §31: "When `user.uid === GUEST_UID`, services MUST short-circuit
before any `callFunction` invocation." This service violates that rule.

## Impact

Any guest who opens the deck store onboarding sees a permanent error card.
"Reintentar" re-calls the same failing function. The only escape is to
navigate away via the Navbar, which is not obvious to a first-time user.

## Evidence

```
src/services/prebuiltDeckService.ts:6-16     fetchDecks calls callFunction with no guest guard
src/components/onboarding/DeckStoreOnboarding.tsx:115-130  error state has only "Reintentar", no dismiss
AGENTS.md §31                               guest-mode architecture rule
```

## Fix

Add a guest short-circuit at the top of `fetchDecks`:

```ts
if (useGameStore.getState().user?.uid === GUEST_UID) {
  return [];  // or a curated local fallback
}
```

Also give `DeckStoreOnboarding` a dismiss/skip button so a failed fetch never
blocks the user.
