# Premium bulk import of 3000+ cards stops at 2000 with quota-exceeded toasts

**Status:** Resolved 2026-10-15 (root cause: the `createList` rate limit, not
quota drift; see Fix below).

## What

A Premium user (declared ceiling: 5000 cards) imported a large Excel/CSV with
more than 3000 cards. Most of the load went through, but quota-exceeded toasts
appeared during the import even though the account was far below its ceiling,
and the session ended with only 2000 cards loaded.

Reported 2026-10-15 while building the 10/20 quota test harness
(`tests/hooks/importQuota.test.tsx`). Parked here with the suspected leads, then
investigated the same day.

## Impact

- One card load lost roughly 1000 cards of work (3000+ requested, 2000 landed).
- Quota-exceeded toasts appeared while the user still had ~2000 cards of
  headroom under the Premium ceiling, so the block is not explained by the
  declared limit.
- Any Premium user doing a large bulk import is exposed; large imports are the
  main onboarding path for existing vocabulary lists.

## Evidence

```
src/services/listService.ts:66-71          updateList projects only the target
  list's length against the ceiling, not
  account total (other lists ignored)

src/hooks/dashboard/useListEditorActions.ts:491-492
  importSelectedCards splits imports into decks of MAX=100 cards; a 3000-card
  load becomes 30 sequential createList/splitList writes, each one a separate
  quota decision point

src/hooks/dashboard/useListEditorActions.ts:123-129
  cleanupAndSave refuses ANY save (including deletions) once
  status.level === 'blocked', and getStatus marks blocked at ratio >= 1.0,
  i.e. exactly at the ceiling

backend/src/functions/src/services/listService/quota.js:47-52
  the authoritative guard lives inside each transaction and reads
  meta.cardCount; if cardCount drifts above the real total, growth is refused
  while the user is under the ceiling — same signature as the old defect in
  done/2026-10-12-premium-sin-limite-de-tarjetas.md (+2000 per request)

P1/2026-10-12-quota-fallback-free.md
  a failed getQuota downgrades Premium to the free ceiling (1000) client-side;
  the "stopped at 2000" figure does not match that ceiling exactly, so drift
  plus fallback may be combined
```

`2000` as a final figure is suspicious: it matches the historical "+2000 per
request" corruption pattern documented in
`done/2026-10-12-premium-sin-limite-de-tarjetas.md`. The first thing to check is
the value of `users/{uid}/meta/main.cardCount` for the affected account versus
the real sum of associations.

## Fix

**Resolved 2026-10-15.** Root cause: `importSelectedCards` created one deck per
100 cards through a client-side `createList` loop, and the `createList` rate
limit is 20/min — 20 decks x 100 cards = exactly 2000 cards, then HTTP 429
surfaced as quota-style toasts. No `cardCount` drift was involved.

The loop is gone: the whole payload now goes in ONE request to the new
Cloud Function `bulkCreateList` (rate limit 10/min), which writes every deck
plus the `cardCount` increment in a single transaction, with the quota
re-checked inside it (atomic: all decks or none). The same handler covers the
YouTube deck loop and guests (local chunking, no HTTP). `createList` stays at
20/min; its remaining callers are single-deck operations. Also fixed while
there: the old multi-deck create path dropped `editList.associations`, and
`QuotaExceededError` was not imported in `listRoutes.js`
(`done/2026-10-11-quota-exceeded-error-sin-importar.md`).

Tests: `tests/hooks/bulkImport.test.tsx`,
`backend/src/functions/tests/bulkCreateLists.test.js`.
