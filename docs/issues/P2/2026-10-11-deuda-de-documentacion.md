# Documentation contradicts the code

**Date:** 2026-10-11
**Priority:** P2
**Status:** Not fixed

## What

Two documents state things the code does not do.

1. **`LAUNCH_PLAN.md` misplaces two features across the free/premium line.**
   It lists *Audio recording* and *Export/Import* as available on **Free**.
   In the code, the record button is Premium-only, and the landing page sells
   "Exporta todos tus datos" as **Premium**. The document and the marketing copy
   disagree with each other.
2. **`dashboard-api-trigger-analysis.md` documents a bootstrap that no longer
   exists.** It describes `getProgress` and `updateProgress` in the dashboard load
   path; `progressService.ts` has no importers and progress is read from
   localStorage only. The same document presents `getDashboardData` as an
   implemented optimisation — the route and rewrite exist, but nothing calls it.

## Impact

`docs/dashboard-api-trigger-analysis.md` is required by AGENTS.md §33 to reflect
the APIs actually triggered when loading the dashboard and `/game`. It currently
does not, which means the changelog requirement is being met against a stale
baseline.

The plan document is the reference used to decide what Premium contains, and it
disagrees with both the code and the pricing page.

## Evidence

```
docs/LAUNCH_PLAN.md:126        | Audio recording | ✅ | ✅ |     <- code gates it to Premium
docs/LAUNCH_PLAN.md:127        | Export/Import   | ✅ | ✅ |     <- landing sells Export as Premium
src/components/views/LandingPage.tsx:237   "Exporta todos tus datos" (premium list)
src/components/game/SessionBar.tsx:58      {isPremium && onRecordToggle && (

docs/dashboard-api-trigger-analysis.md     describes getProgress/updateProgress in bootstrap
src/services/progressService.ts            no importers
```

## Fix

Reconcile `LAUNCH_PLAN.md` against the code once the Premium contents are decided
in [`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md) §4 — until then any edit would
encode a decision that has not been made.

Independently of that, `dashboard-api-trigger-analysis.md` can be corrected now:
drop the removed bootstrap calls, and either connect or remove `getDashboardData`
along with its rewrite.