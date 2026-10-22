# No limit on the number of decks a user can create

**Resolved:** 2026-10-22 (U-07). `maxDecks` added to both tiers in `plans.json`
(free 50, premium 200). The server asserts it inside the transactions of the
three routes that create decks — `persistNewListWithAssociations`,
`bulkCreateLists`, `divideOriginalListIntoGroupsAndReplaceIt` — and decrements
on `removeListAndDecrementUserCardCount`, through
`assertDeckQuotaHasRoom`/`canAddDecks`. Meta docs gained a `listCount` field
that rebuilds on creation (`getOrCreateMeta`) and backfills absolutely for
legacy docs on first write (`resolveListCount` + `listCountWrite`); delete
floors at 0. The client mirrors the check in `useAppHandlers.deckGate`
(`handleCreateList`, `handleBulkCreateLists`, `handleCreateMultipleLists`) so
the user sees the ceiling before the round trip; an unknown tier blocks with
`QUOTA_UNKNOWN_MESSAGE`, never manufacturing "free" (same rule as
`done/2026-10-12-quota-fallback-free.md`). Tests: `deckQuota.test.js` (17),
`tests/hooks/deckCeiling.test.tsx` (10), plus `plansDrift`/`cardCountRebuild`
assertions.

## What

Card totals are capped per tier (1000 free, 5000 premium — though the premium
cap is not enforced, see `2026-10-12-premium-sin-limite-de-tarjetas.md`), but
nothing caps how many decks a user may own. `createList` is limited only by a
rate limit of 20 requests/minute and by the card quota, so a single-word deck
never touches the card quota.

## Impact

- A user can create 10,000 decks of one card each and stay inside every
  existing limit.
- Each deck is a Firestore document plus an associations subcollection, plus a
  row in the dashboard aggregate the dashboard loads on every visit.
- `splitList` amplifies this: each split produces additional decks.
- 20 requests/minute means a 1000-deck account is reachable in under an hour.

## Evidence

```
$ grep -rniE "maxLists|max_decks|listsLimit|MAX_LISTS|tooManyLists" \
    backend/src/functions/src src/
  (no results)

backend/src/functions/src/services/listService/quota.js  — validates card count only
backend/src/functions/src/utils/rateLimit.js:6   createList: { requests: 20, windowMs: 60000 }
backend/src/functions/src/config/plans.json — no deck-count field in either tier

dashboard-api-trigger-analysis.md — the dashboard reads a per-user aggregate
that grows with the number of decks
```

## Fix

Add a `maxDecks` field to both tiers in `plans.json` and check it in
`persistNewListWithAssociations`, next to the existing card checks.