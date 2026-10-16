# Raw English error messages surface in the Spanish UI

**Date:** 2026-10-16
**Priority:** P2
**Status:** Not fixed

## What

Several catch blocks display `error.message` verbatim in toasts. Fetch and
network failures carry English messages from the browser ("Failed to fetch",
"NetworkError when attempting to fetch resource", "Load failed"), so a
Spanish-speaking user sees untranslated browser text with no guidance.

## Impact

Cosmetic/UX only; no data loss. Observed in production on 2026-10-16 when the
bulk-import keepalive bug surfaced "failed to fetch" to the user.

## Evidence

```
src/hooks/app/useAppHandlers.ts:347-350   showToast(error.message) on bulk import
src/hooks/app/useAppHandlers.ts:84-87     showToast(error.message) on sync
src/hooks/app/useAppHandlers.ts:245-248   showToast(error.message) on create list
src/hooks/app/useAppHandlers.ts:455-458   showToast(error.message) on delete list
src/hooks/app/useAppHandlers.ts:495-498   showToast(error.message) on split list
```

## Fix

Map common network/transport failures to friendly Spanish copy before the
toast (e.g. a `toUserMessage(error)` helper in `src/utils/`), keeping the raw
message for `logEvent` once the P0 observability plan
(`docs/plans/2026-10-16-client-error-observability.md`) ships.
