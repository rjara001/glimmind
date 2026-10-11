# Minor bugs: quota misreported, dropped deltas, re-paid cards

**Date:** 2026-10-11
**Priority:** P2
**Status:** Not fixed

## What

Three independent defects, all in the study/sync path.

1. **Premium users are told the free translation limit.**
2. **`syncInProgress` silently discards review deltas.**
3. **Reloading the page re-pays the first card of a session.**

## Impact

**1.** `translateVocabulary.js` returns `TRANSLATION_USER_MONTHLY_CHARS` (20,000)
as the limit regardless of tier, so a Premium user who has consumed 100,000
characters is told they have 20,000. The real quota is enforced correctly; only
the reported number is wrong.

**2.** `recordRepaso` calls `syncToCloud` directly instead of `addPendingDelta`.
When a sync for the same list is already in flight, `flushSync` returns early
and the delta is never queued. With one card every 5-15s against a ~300ms
round-trip this rarely fires, but it is silent data loss when it does.

**3.** `applyRepaso` deduplicates with `playedToday`, which lives only in the
zustand store and is not persisted. An F5 mid-session re-sends the first card.

## Evidence

```
routes/translateVocabulary.js:105   returns the free limit for every tier
store/gameStore.ts:991              syncInProgress -> early return, delta not queued
utils/progress.ts:141               if (playedToday.includes(...)) return null
store/gameStore.ts:723              if (!result) return;   // dedupe is in-memory only
```

## Fix

1. Return `getAiDailyLimit`-style tier lookup, mirroring how `getQuota` resolves
   `translationCharLimit` (`userService.js:13-15`) — the correct value is already
   computed there.
2. Route `recordRepaso` through `addPendingDelta` so deltas queue behind an
   in-flight sync.
3. Persist `playedToday`, or make the dedupe key a stable per-session id rather
   than store state.