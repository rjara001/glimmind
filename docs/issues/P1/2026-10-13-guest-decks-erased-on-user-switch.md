# Guest decks are erased when a real account loads on the same device

**Date:** 2026-10-13
**Priority:** P1
**Status:** Not fixed

## What

`glimmind_lists` is a single localStorage key shared by every account on the
device. `loadInitialData` filters the stored decks by the current owner and
immediately writes the filtered array back to the same key
(`src/store/gameStore.ts:989-995`). Guest decks live only in localStorage, so
when a real user loads after a guest session, the guest's decks are filtered
out of the write-back and are gone for good. The reverse switch (guest after a
real user) also drops the real user's local cache, though that user's decks can
be restored from the cloud.

## Impact

A guest who creates decks and later signs in (or refreshes while logged in)
loses every guest deck with no recovery path: they were never synced. The loss
is silent — the dashboard simply shows the signed-in account's decks.

## Evidence

- `src/store/gameStore.ts:988-995` — `ownerUid` filter followed by
  `safeStringify(LOCAL_STORAGE_KEY, normalizedParsed)`, which overwrites decks
  belonging to other uids.
- `backupLocalLists` (`src/store/gameStore.ts:166`) backs up under another key
  but only in the cloud-fetch path, so it does not cover the guest→real switch
  when the TTL is fresh.

## Fix

Scope the local cache per uid (e.g. `glimmind_lists_<uid>`) or merge on
write-back so decks of other owners are preserved in storage instead of
dropped. Guests must keep a migration path from the current shared key.
