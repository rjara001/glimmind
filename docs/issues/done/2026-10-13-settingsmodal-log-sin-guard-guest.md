# SettingsModal calls logEvent with no guest guard

**Date:** 2026-10-13
**Priority:** P2
**Status:** Resolved 2026-10-16 — the guest guard was moved into `logEvent`/`flushEventQueue` itself (`src/services/errorReporting.ts`), covering every call site including `SettingsModal`, as part of the P0 client-error observability fix.

## What

`SettingsModal` fires `logEvent('settings.modal_opened', …)` in a mount
effect without checking whether the current user is a guest. `logEvent`
routes through `callFunction('/api/logClientError')`, which for a guest
produces a wasted HTTP request (the function is unauthenticated and the
rewrite is also missing — see P1 `log-client-error-sin-rewrite`).

Per AGENTS.md §31, guest-mode requests must never reach `callFunction`.

## Impact

One extra network round-trip every time a guest opens the list settings
modal. Not user-visible, but it violates the guest offline/local-only
architecture and adds noise to the network log that the E2E `networkGuard`
has to filter.

## Evidence

```
src/components/modals/SettingsModal.tsx:55  logEvent called in useEffect with no GUEST_UID check
src/services/callFunction.ts               logEvent -> callFunction('/api/logClientError')
AGENTS.md §31                               guest-mode architecture rule
```

## Fix

Either skip `logEvent` when `useGameStore.getState().user?.uid === GUEST_UID`,
or move the guest check into `logEvent` / `callFunction` itself so all call
sites are covered by one guard.
