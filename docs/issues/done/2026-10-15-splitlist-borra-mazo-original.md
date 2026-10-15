# splitList deletes the original deck

Status: fixed on 2026-10-15 (pending deploy of the release that carries it).
`groups[0]` now replaces the original deck in place and the document is never
deleted; the client sends all groups (no pre-save/polling dance) and refreshes
the local cache from the cloud after the split. Verified on the emulator:
250-card deck split into 100/100/50 — the original survives with part 1, the
two new decks hold the rest, all 250 cards accounted for, `cardCount` stays at
250. Tests: `tests/services/cardCeiling.test.ts` (splitList section).

## What

`divideOriginalListIntoGroupsAndReplaceIt` (`backend/src/functions/src/services/listService/crud.js:223`)
creates a document for every group it receives (groups 2..N) and then deletes
the original deck with `tx.delete(originalRef)` (`crud.js:268`). Group 1 — up to
100 cards — was only saved into the original deck's document, so deleting it
loses the first chunk.

The client sends the full set of groups (`useListEditorActions.ts` calls
`onCreateMultiple(groups.slice(1), firstId)`, so group 1 is implicitly the
original deck), which makes the deletion correct only when the caller
pre-populated the original deck with group 1 first. No such pre-population
happens in the bulk-import flow.

## Impact

Any multi-deck import/split loses the first 100 cards silently. Visible in
production as a missing `Muchos_Terminos_export-3` sibling deck and in the
P0 audit of 2026-10-15: the `Muchos_Terminos_export` chunked import produced
decks `-2`, `-4`…`-8` with no `-3`.

## Evidence

- `backend/src/functions/src/services/listService/crud.js:223-268`
- Client flow: `src/hooks/dashboard/useListEditorActions.ts` (import → `onCreateMultiple(groups.slice(1), firstId)`)

## Fix

Either keep the original document and write group 1 into it, or create N new
documents and delete the original only after all groups (including group 1)
exist.
