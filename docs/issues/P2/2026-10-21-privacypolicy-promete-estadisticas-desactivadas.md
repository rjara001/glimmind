# Privacy and cookie policies promise statistics that are switched off

**Date:** 2026-10-21
**Status:** Not fixed

## What

`PrivacyPolicy.tsx` and `CookiePolicy.tsx` tell users that the app collects and uses "statistics", but the reports feature is disabled: `FEATURE_FLAGS.reports` is `false`, so `/reports` renders the under-construction branch, the Navbar and header entries are filtered out, and the Settings entry never links to it. No statistics screen is reachable in the product today.

## Impact

- Two legal pages promise a capability that does not exist. This is the same defect class already recorded for the sync promise (`docs/issues/P1/2026-10-12-sync-config-sin-conectar.md`) and called out by `docs/plans/2026-10-20-cycle-presentation-clarity.md` §D5.
- A user reading the policy is told "statistics" are part of the product; the promise cannot be honoured until reports ship.

## Evidence

```
src/components/views/PrivacyPolicy.tsx:23   "Cycle progression state, review history, statistics"
src/components/views/CookiePolicy.tsx:65    "Game progress, statistics, review history"
src/constants/featureFlags.ts:2             reports: false,
src/App.tsx:347                             isFeatureEnabled('reports') ? <ReportsView/> : fallback
src/components/Navbar.tsx:44                hides /reports while the flag is off
src/components/layout/AppHeader.tsx:70      renders the entry only when the flag is on
src/components/views/ReportsView.tsx:56     "Esta funcionalidad está en desarrollo."
```

## Fix

Either remove the word "statistics" from both legal pages (copy-only change, no product decision), or ship reports and flip `FEATURE_FLAGS.reports`. Shipping reports is a product decision — record it in `docs/BUSINESS_MODEL.md` (stats are listed as a Premium differentiator) before touching the flag.
