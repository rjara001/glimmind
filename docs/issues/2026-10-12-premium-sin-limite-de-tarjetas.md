# Premium users have no card limit at all

## What

A Premium subscriber has no ceiling on the number of cards they can create.
`validateUserCardQuotaNotExceeded` computes the tier allowance and then
explicitly skips the check when the tier is Premium, and
`resolveListCardLimit` hands Premium an `Infinity` per-list limit. The
`maxCards: 5000` entry in `plans.json` is therefore never enforced for the tier
that is supposed to get it. One €4.99 payment buys unbounded Firestore writes.

## Impact

- `plans.json` declares Premium `maxCards: 5000`; the enforced Premium limit is
  **unbounded**.
- `createList` accepts any number of associations for a Premium user, and
  `updateList` / `splitList` accept unbounded deltas, so the limit cannot be
  reached by any route.
- Cost exposure is Firestore document writes plus the association subcollection
  read/write per card, paid for by a single one-time payment.
- A user who paid once can write as much as a fleet of free users that each
  stop at 1000 cards.

## Evidence

```
backend/src/functions/src/services/listService/quota.js:6
  const maxAllowed = isPremium ? Infinity : QUOTA_CONFIG.maxCardsPerList;

backend/src/functions/src/services/listService/quota.js:32
  if (!isPremium && newCardsCount > 0 && cardCount + newCardsCount > effectiveQuota) {

backend/src/functions/src/services/listService/quota.js:28
  const effectiveQuota = QuotaService.getEffectiveQuota(meta.cardCount || 0, tier);
  // computed, then discarded for Premium

backend/src/functions/src/utils/quotaConfig.js  getEffectiveQuota
  return maxCards;   // 5000 for premium — never reached, the caller skips it

backend/src/functions/src/services/listService/crud.js:105,106,160,247
  all three call sites inherit both behaviours

backend/src/functions/src/config/plans.json:6
  "maxCards": 5000   // declared but not enforced for premium
```

## Fix

Drop the `!isPremium` guard on the aggregate check and return a finite
`maxCardsPerList` for Premium. Both limits live in `plans.json`, so the
correction needs no new constant.