# updateList swallows remote write failures

## What

`firestoreService.updateList` (`src/services/firestoreService.ts:37-45`) catches
every error from the `updateList` Cloud Function, logs a `console.warn`, and
does not re-throw. The comment says this is for anonymous users, but the guest
path never reaches this function (`useAppHandlers.handleUpdateList` short-circuits
on `GUEST_UID`), so the catch only hides real failures for authenticated users.

## Impact

The editor shows "Lista guardada" after a save that never reached the cloud.
This was a contributing factor to the P0 deck wipe of 2026-10-15: the empty
deck was written silently, and the user had no signal that the write had failed
(`docs/issues/P0/2026-10-15-updateListFields-corrompe-associations.md`).

## Evidence

- `src/services/firestoreService.ts:37-45`

## Fix

Re-throw for authenticated users (or at least surface the failure to the caller
so the UI can show an error toast), keeping the swallow only where a local-only
update is genuinely intended.
