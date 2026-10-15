# updateListFields corrupts `associations` from array to map

## What

`updateListFields` applies session deltas with a partial Firestore update keyed by
association id:

```js
updates[`associations.${delta.id}.${field}`] = value;   // crud.js:320
```

Association ids are UUIDs, not numeric array indexes. Firestore does not address
array elements by a non-numeric key: the write replaces the whole `associations`
array with a map `{ <uuid>: { hits, isLearned, status, ... } }`. The map entries
carry **only the delta fields** — `term` and `definition` are gone from the
document.

The corrupted shape then cascades:

1. `flattenList` (`src/store/gameStore.ts:133`) sees a non-array and returns
   `associations: []` with `changed: true`, so the deck renders as "0 pairs" and
   the empty array is persisted to localStorage.
2. Opening the corrupted deck in the editor and touching any row triggers the
   blur auto-save (`useListEditorActions.ts:259`), which writes
   `associations: []` back to the cloud through `updateList` — the corruption
   becomes a permanent deletion.
3. `firestoreService.updateList` swallows write failures
   (`src/services/firestoreService.ts:41-44`), so the UI shows "Lista guardada"
   even when the deletion failed.

## Impact

Production audit on 2026-10-15 (`fladycard-22a3e`, uid `Av79d8fSo1MLq4bcDiizYbUhdkO2`):

| Metric | Value |
|---|---|
| Corrupted decks | 7 (`Muchos_Terminos_export-2/-4/-5/-6/-7/-8`, `Valores__Religi_n_y_T_rminos_Arcaicos_export`) |
| Cards lost (term/definition) | 652 |
| Cards with real progress at corruption time | 74 (27 marked learned) |
| Last corrupted write | 2026-09-25T18:27:12Z — one day after the delta sync shipped (`b544f3c`, 2026-09-24) |

No backup path exists in the cloud for the lost text; recovery requires an
external source (original CSV or the parent decks).

## Evidence

- Production documents: every corrupted deck stores `associations` as a map whose
  entries contain exactly `isLearned, currentCycle, misses, timesPlayed, status, hits`.
- Timeline: `b544f3c` (2026-09-24, delta sync + new CF `updateListFields`) →
  `dda29b9` (2026-09-25, "handle object associations… before.map is not a function")
  → `b8d08d8` (2026-10-09, `flattenList` guard) → `a0a46c1` (2026-10-13, bootstrap fix).
- Client fixture `tests/store/gameStore.flattening.test.ts:26` records the same
  cloud shape ("Q is not iterable").
- Local reproduction (emulators, no fix):

```
RESULT: BUG
  associations is now a MAP with 1 keys
  first entry (aaaaaaaa-1111-4aaa-8bbb-000000000001): {"hits":1,"isLearned":false,...}
  term/definition are gone from the document (only the delta fields remain).
```

(`node scripts/repro-p0-updateListFields-corruption.mjs`, exit 1)

## Fix

Status: implemented in code on 2026-10-15, pending commit/deploy. Verified
locally with `scripts/repro-p0-updateListFields-corruption.mjs`
(`RESULT: OK`, array of 3 preserved, delta applied in place).

- `backend/src/functions/src/services/listService/crud.js` — `updateListFields`
  now reads the document inside the transaction, normalizes `associations` to an
  array (legacy maps are rebuilt as `{ id: key, ...value }`), applies the deltas
  in memory, and writes the full array. Partial dotted updates on `associations`
  are gone; the logic lives in `backend/src/functions/src/utils/associationDeltas.js`.
- `src/store/gameStore.ts` — `flattenList` no longer marks the `[]` fallback as
  `changed`, so a corrupted deck is never pushed through the sync path.
- `src/hooks/dashboard/useListEditorActions.ts` — `cleanupAndSave` refuses to
  persist a 0-card save unless the caller passes `allowEmpty`
  (`handleRemoveRow` / `handleDeleteSelected` do).
- `scripts/repro-p0-updateListFields-corruption.mjs` — regression script.

## Pending (parked, out of scope of the fix)

- `docs/issues/P1/`: `splitList` deletes the original deck (`crud.js:267`), which
  loses the first 100-card group of a multi-deck import.
- `docs/issues/P1/`: `helpers.js:46` sums only arrays, so a corrupted deck drives
  the user's `cardCount` to 0 and breaks the quota wall.
- `docs/issues/P2/`: `firestoreService.updateList` swallows remote write errors.
