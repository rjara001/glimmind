# The Premium sync tier is never wired to anything

## What

`syncConfig.ts` defines a per-tier sync policy — Free every 5 minutes,
Premium every 2 minutes, larger batches and more retries for Premium — and
exports four accessors to read it. None of the four accessors has a caller, and
`usePeriodicSync`, the hook that would apply the interval, is never mounted. The
only tier-independent path is `flushSync`, which runs on tab close and page
hide, using `keepaliveSafeLimit`.

## Impact

- Premium's advertised "priority sync" does not exist for either tier. The
  5-min vs 2-min split, the batch sizes and the retry counts are dead
  configuration.
- All users sync on the same trigger: closing the tab. A user who studies for an
  hour and closes the laptop keeps that hour unsynced until reopen.
- Marketing should not describe a faster sync until this exists.

## Evidence

```
$ grep -rn "usePeriodicSync" src/ | grep -v "usePeriodicSync.ts:"
  (no results)

src/hooks/game/usePeriodicSync.ts:7    export function usePeriodicSync() {   // never imported

src/constants/syncConfig.ts:22,26,30,34  getPeriodicIntervalMs / getMaxDeltasPerBatch
                                        getMaxRetryAttempts / getRetryConfig
  $ grep -rn "getPeriodicIntervalMs\|getMaxDeltasPerBatch\|getMaxRetryAttempts\|getRetryConfig" src/
  src/constants/syncConfig.ts   (definitions only, zero callers)

src/store/gameStore.ts:1011,1057-1058   the only SYNC_CONFIG reads, both tier-independent
                                        (keepaliveSafeLimit, maxConflictRetries)
```

## Fix

Mount `usePeriodicSync` once at the app level and pass the resolved tier to
`getPeriodicIntervalMs`, or delete the unused tier fields so the configuration
stops advertising a policy that is not implemented. The first option requires a
product decision and belongs in [`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md).