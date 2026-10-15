# cardCount falls to 0 when a deck's associations are not an array

Status: fixed on 2026-10-15 (pending deploy of the release that carries it).
`getOrCreateMeta` now runs every deck through `normalizeAssociationsToList`, so
map-shaped decks count toward the rebuilt total. Test:
`backend/src/functions/tests/cardCountRebuild.test.js`.

## What

`getOrCreateMeta` (`backend/src/functions/src/utils/helpers.js:45-49`) rebuilds
the user's `cardCount` by summing `associations.length` and treats any non-array
value as 0:

```js
return sum + (Array.isArray(associations) ? associations.length : 0);
```

A deck whose `associations` was corrupted into a map (the P0 of 2026-10-15)
contributes 0, so the rebuilt counter under-reports every card in that deck.

## Impact

The quota wall (`assertCardQuotaHasRoom`) is fed a `cardCount` that can drop to
0 for users with corrupted decks, letting them create cards past their real
quota; free-tier messages also show wrong usage (`SettingsView` renders
`cardCount/cardQuota`). The production audit of 2026-10-15 found the affected
user's `meta/main.cardCount` at 941 while the healthy sibling account showed
5524 — inconsistent totals across what is effectively the same content.

## Evidence

- `backend/src/functions/src/utils/helpers.js:45-49`
- Correlated fallbacks: `backend/src/functions/src/routes/userRoutes.js` returns
  `cardCount: 0` when the meta doc is missing.

## Fix

Sum `Object.keys(associations).length` for map-shaped values as well, and
backfill the correct total once the corrupted decks are repaired (normalize
map → array).
