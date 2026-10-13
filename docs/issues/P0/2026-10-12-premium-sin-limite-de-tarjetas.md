# Premium users can exceed the card ceiling through updateList and splitList

## What

`plans.json` declares `maxCards: 5000` for Premium. `createList` enforces it,
inside a transaction, through `QuotaService.canAddCards`. `updateList` and
`splitList` do not: both call `validateUserCardQuotaNotExceeded`, which returns
early for Premium because of the `!isPremium &&` guard on line 32. Neither route
performs any other card-count check. A Premium account has no ceiling.

## Impact

- Reproduced on the emulator: one Premium account went from 4100 to **16000**
  cards against a declared maximum of 5000, growing by 2000 per request with
  every response `HTTP 200`.
- Once above the ceiling the account cannot create new lists, but it can keep
  growing existing ones indefinitely, so the overrun never converges.
- Cost exposure is the association write per card, paid for by a single
  one-time payment.

### Reachability: API only, not the interface

An earlier version of this issue claimed the hole was reachable by clicking
through the product. **That was wrong**, and it is corrected here.

The client re-checks the ceiling on every path that can add a card, and it
blocks Premium at exactly 5000 as well:

```
useListEditorActions.ts:195-208   handleAddRow       -> blocked
useListEditorActions.ts:408-420   bulk import        -> blocked
useListEditorActions.ts:114-127   save               -> blocked
useListEditorActions.ts:204       split              -> blocked
useAppHandlers.ts:153             save from editor   -> blocked
```

Each computes `QuotaService.getStatus(totalCards, tier)` with no tier exemption.
At 5100 cards with a correct Premium quota the client computes
`maxCards = 5000`, `usageRatio = 1.02`, `level = "blocked"` and refuses.

`ListEditor.tsx:206` disables the add-row button with
`!isPremium && level === "blocked"`, which looks like an exemption but is not:
it only greys the button. The click handler re-checks without any tier
condition, so Premium is stopped there too.

So the hole is reachable by anything that calls the endpoint directly: curl, a
script, a modified or third-party client. It is still a P0 for a metered
resource, because the server is the thing that is supposed to hold the line and
on two of three routes it does not. It is not reachable by using the app.

## Evidence

Reproduce it yourself. `scripts/repro-p0-curl.sh` drives the real HTTP routes
with nothing but curl, jq and python3, so every status code is visible. It exits
1 while the defect is present, 0 once fixed, and 2 if it could not tell: a
rate-limited or unexpected answer is never reported as a pass.

```
Terminal 1:  npm run emulators
Terminal 2:  scripts/repro-p0-curl.sh      # wait 60s between runs
```

Output as of 2026-10-12:

```
== 2. Build the account up to 4100 cards
   createList 100   -> HTTP 200  DozNbCJucmZI1Lk2z98x
   createList 2000  -> HTTP 200  WDg4x6znrFBaFBhTXzAi
   createList 2000  -> HTTP 200  xIJc05kSlbxogZbE4vxg

== 3. createList across the ceiling   (this route IS bounded)
   4100 + 2000 = 6100   ceiling 5000
   -> HTTP 500  QuotaExceededError is not defined
   cardCount 4100 -> 4100
   PASS  createList: refused with HTTP 500, counter unchanged

== 4. updateList across the ceiling   (this route is NOT bounded)
   4100 + 1900 = 6000   ceiling 5000
   -> HTTP 200  {"success":true}
   cardCount 4100 -> 6000
   FAIL  updateList: accepted HTTP 200, cardCount reached 6000, 1000 over a 5000 ceiling

== 5. splitList across the ceiling   (this route is NOT bounded)
   6000 + 2000 = 8000   ceiling 5000
   -> HTTP 200  {"ids":["jJpjGXgfks6jFR5Ab7hF","qj2zrlbzpeaHwdTQyWhe"]}
   cardCount 6000 -> 8000
   FAIL  splitList: accepted HTTP 200, cardCount reached 8000, 3000 over a 5000 ceiling

== 6. The overrun does not converge
   cardCount trail: 8000 -> 10000 -> 12000   ceiling 5000

-- Summary --
   2 check(s) failed. That is the defect.
```

`scripts/verify-p0-premium-cards.mjs` does the same thing from Node and prints
the same result. The shell version is the one to read first, because it shows
the raw status codes.

The guarding check and the two holes:

```
backend/src/functions/src/services/listService/crud.js:115   GUARD
  if (!QuotaService.canAddCards(currentCardCount, count, currentTier)) throw ...
  -> quotaConfig.js:60  currentCards + cardsToAdd <= getMaxCards(tier)
  -> plans.json:10  premium maxCards = 5000
  inside db.runTransaction, so it is race-free. Only createList reaches it.

backend/src/functions/src/services/listService/crud.js:160   HOLE (updateList)
  validateUserCardQuotaNotExceeded(currentMeta, currentDelta);

backend/src/functions/src/services/listService/crud.js:247   HOLE (splitList)
  validateUserCardQuotaNotExceeded(meta, delta);

backend/src/functions/src/services/listService/quota.js:32    THE GUARD THAT DISABLES IT
  if (!isPremium && newCardsCount > 0 && cardCount + newCardsCount > effectiveQuota) {

backend/src/functions/src/services/listService/quota.js:6    DEAD BRANCH
  const maxAllowed = isPremium ? Infinity : QUOTA_CONFIG.maxCardsPerList;
  // the only caller of resolveListCardLimit inlined its own copy instead, at crud.js:104

backend/src/functions/src/services/listService/crud.js:104   DEAD BRANCH
  const maxAllowed = meta.tier === "premium" ? Infinity : MAX_CARDS_PER_LIST;
  masked: line 115 rejects the oversized list anyway

src/components/ListEditor.tsx:206   THE CLIENT MIRRORS IT
  isAddRowDisabled={!isPremium && quotaData.quotaStatus?.level === "blocked"}
```

## Corrections to the original filing

The first version of this issue claimed `createList` accepts any number of
associations for Premium. **That is false.** It was written by reading the
`validateUserCardQuotaNotExceeded` call at `crud.js:106` without noticing the
second, transactional guard at `crud.js:115`, added in `bb6725a` (v1.12.0). The
route is correctly bounded; only `updateList` and `splitList` are not.

## Interaction with the ReferenceError

In production the quota wall on `createList` answers **HTTP 500**, not 400:
`listRoutes.js` never imports `QuotaExceededError`, so the `instanceof` check in
its own catch block throws. See
[`../P1/2026-10-11-quota-exceeded-error-sin-importar.md`](../P1/2026-10-11-quota-exceeded-error-sin-importar.md).
Measuring this issue required patching that import first. The two holes above
are unaffected by it: those routes return 200, so the broken catch is never
reached.

## Fix

Apply the same `QuotaService.canAddCards` check to `updateList` and `splitList`,
inside the transactions that already exist at `crud.js:148` and `crud.js:243`.
Both already read `currentMeta` and the delta, so the check needs no new read and
no new constant.

Dropping the `!isPremium &&` on `quota.js:32` alone is not sufficient: the two
routes need the transactional check, not the advisory one, or concurrent updates
will race past it the way the non-atomic quota fix did.

Note that until this lands, the client is the only thing holding the line for
these two routes. That is what
[`../P1/2026-10-12-quota-fallback-free.md`](../P1/2026-10-12-quota-fallback-free.md)
picks at: if the client's quota fetch fails, the line is not held at all.