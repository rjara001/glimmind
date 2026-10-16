# Oversized bulk import fails entirely instead of taking what fits

**Date:** 2026-10-16
**Priority:** P1
**Status:** Done (implemented 2026-10-16, released in v1.40.3)

## What

A bulk import larger than the user's remaining quota is rejected in full.
A premium user with 5000 cards of headroom pasting a 6000-card file imports
nothing: `listService.bulkCreateLists` throws `QuotaExceededError` and the
whole operation aborts, discarding even the cards that fit.

## Impact

Users with large CSVs lose the entire import when they cross the tier quota
boundary (free 1000 / premium 5000). No partial import, no guidance on how
many cards would fit. Reported 2026-10-16 by the owner after validating the
keepalive fix with a 700+ card import.

## Evidence

```
src/services/listService.ts:60-63          throws QuotaExceededError on oversize
src/hooks/dashboard/useListEditorActions.ts:486-529  importSelectedCards sends every selected card
src/config/plans.json                       free maxCards 1000, premium maxCards 5000
backend .../validation.js                   BulkCreateListSchema .max(5000) per request (separate cap, clean 400)
```

## Fix

Truncate to the remaining headroom and say so in the validation screen:

1. `handleBulkAdd` computes `importLimit` = remaining quota (create mode
   also discounts rows already in the editor) and stores it with the
   validation result.
2. `ValidationScreen` shows an inline notice when the selection exceeds the
   limit: file has X, limit is Y, first Y will be imported, Z discarded.
3. `importSelectedCards` slices `toImport` to `importLimit` (file order
   preserved) and the success toast reports the discarded count.

Full plan: [`docs/plans/2026-10-16-import-truncate-to-quota.md`](../../plans/2026-10-16-import-truncate-to-quota.md).
