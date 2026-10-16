# Bulk import: truncate to the remaining quota instead of failing whole

**Date:** 2026-10-16
**Status:** Parked — awaiting go
**Issue:** [`docs/issues/P1/2026-10-16-import-mayor-al-limite-falla-completo.md`](../issues/P1/2026-10-16-import-mayor-al-limite-falla-completo.md)

## Problem

An import larger than the user's remaining quota fails entirely. A premium
user with 5000 cards of headroom pasting a 6000-card file gets
`QuotaExceededError` and imports nothing, with no option to take what fits.
The failure has three layers today, all all-or-nothing:

1. `handleBulkAdd` (`src/hooks/app/useAppHandlers.ts:433` via
   `useListEditorActions.ts:433`) only blocks when `level === 'blocked'`
   (usage ≥ 100%), so oversized pastes reach validation.
2. `importSelectedCards` (`useListEditorActions.ts:486`) sends every selected
   card.
3. `listService.bulkCreateLists` (`src/services/listService.ts:60-63`) throws
   `QuotaExceededError` when `associations.length > status.maxCards`.

The schema hard cap (5000/request in `BulkCreateListSchema`) is a separate
constraint and is NOT the target here: it answers 400 cleanly and a single
request already matches the premium ceiling. This plan addresses the quota
(`plans.json` tiers: free 1000, premium 5000 total active cards).

## Behaviour (target)

Let `importLimit` = `status.remainingCards` (quota headroom **right now**),
and in create mode also discount rows already sitting in the editor
(`editList.associations.length`, which the store quota does not yet count).

- `selectedCount <= importLimit` → unchanged.
- `0 < importLimit < selectedCount` → ValidationScreen shows an inline
  notice: "Tu archivo tiene X tarjetas seleccionadas. Tu límite es Y.
  Se importarán las primeras Y; Z quedarán fuera." On confirm, the first
  `importLimit` cards **in file order** are imported; the rest are discarded
  with a success toast that says so ("✅ Y tarjetas importadas (Z fuera por
  tu límite)").
- `importLimit === 0` → current blocking toast, unchanged.

File order is preserved because `categorized` is built by iterating the
parsed cards in order (`importValidationService.ts:78-148`); the truncate is
a `slice(0, importLimit)` over the selected `toImport` array. "First N" means
first N of the file, regardless of category — categories are a filter, not a
priority.

## Changes

### 1. `src/hooks/dashboard/useListEditorActions.ts`

- `handleBulkAdd`: compute `importLimit` after the existing quota status
  check (create mode: `status.remainingCards - editList.associations.length`,
  floored at 0; edit mode: `status.remainingCards`) and store it in component
  state next to `validationResult` (e.g. `setImportLimit(...)`). The existing
  `level === 'blocked'` early return stays.
- `importSelectedCards`: after building `toImport`, truncate:
  `const accepted = toImport.slice(0, importLimit)`; use `accepted` for every
  downstream payload (`onBulkCreate`, `onSave`, `onCreateMultiple` groups,
  toasts). Toast mentions discarded count when `toImport.length > accepted.length`.
- Expose `importLimit` (and its setter if ListEditor needs it) through the
  hook return.

### 2. `src/components/list-editor/ValidationScreen.tsx`

- New optional prop `importLimit?: number` on `ValidationScreenProps`.
- When `importLimit != null && selectedCount > importLimit && importLimit > 0`,
  render an amber inline notice with the X/Y/Z copy (above the actions).
- Button subtitle switches from "{selectedCount} tarjetas seleccionadas" to
  "Se importarán {min(selectedCount, importLimit)} de {selectedCount}" while
  the notice is visible.

### 3. `src/components/ListEditor.tsx`

- Pass `importLimit` from the editor state into `<ValidationScreen />`
  (line ~178).

### 4. No server change

`listService.bulkCreateLists` and the backend quota/zod checks stay as the
defence in depth; the client now never exceeds the headroom in the normal
flow.

## Tests (`tests/hooks/bulkImport.test.tsx` + component test)

- Update the existing case "refuses a 30-card import against the injected
  premium limit of 20" → it must now import the first 20 and report 10
  discarded (zero HTTP calls still holds if the mock quota is injected the
  same way).
- New: edit-mode truncate → `onSave` receives exactly `importLimit` cards.
- New: create-mode discount of in-editor rows (premium limit 20, editor has
  5 rows, paste 30 → 15 accepted).
- New: ValidationScreen renders the notice and the corrected subtitle when
  over the limit; no notice when under it.
- New: toast text includes the discarded count on truncate.

## Out of scope

- Onboarding flow (`ImportValidationModal` / `DeckValidationScreen`): separate
  UI, no quota wiring today. Can reuse the same pattern later.
- Raising the 5000/request schema cap or splitting into multiple requests.
- Archiving overflow instead of discarding (product decision, see
  `docs/BUSINESS_MODEL.md` if ever wanted).

## Release

Patch bump; normal deploy.
