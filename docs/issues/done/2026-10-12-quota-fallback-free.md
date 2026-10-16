# A failed getQuota silently downgrades a Premium user to free limits

**Status:** Resolved 2026-10-16 with option 1 — a new `resolveTierForGate(quota, userUid)` helper in `quotaService.ts` distinguishes the two meanings of `quota === null`: for guests (and signed-out users) free is the correct tier; for an authenticated user the tier is UNKNOWN and the four client gates (`cleanupAndSave`, `handleAddRow`, the import gate in `useListEditorActions`, and `handleQuickAdd` in `useAppHandlers`) now block with `QUOTA_UNKNOWN_MESSAGE` ("No pudimos verificar tu plan…") instead of manufacturing free limits. Server-side quota enforcement is unchanged and remains the authority. Regression-locked by `tests/services/quotaFallback.test.ts` and a case in `tests/hooks/bulkImport.test.tsx`.

## What

`quota` starts as `null` in the game store and is only populated when
`getQuota` resolves. Every quota gate in the editor then reads the tier with
`currentQuota?.tier || "free"`, so a failed fetch does not leave the UI without
limits, it leaves it with the wrong ones.

The failure is swallowed with a `console.warn`. Nothing tells the user their
tier could not be read.

## Impact

- A Premium subscriber whose `getQuota` call fails is blocked at **1000** cards
  with the message "Llegaste a tu límite de 1000 tarjetas", while paying for
  5000. Reproduced 2026-10-12 against the emulator: a Premium account holding
  5100 cards was refused by the client, and the message named the free ceiling.
- The failure is indistinguishable from being genuinely on the free tier, so it
  cannot be self-diagnosed by the user.
- For a free user the same failure is harmless, because the fallback happens to
  be correct. That is what hides it.
- The block happens before any network call, so retrying the save does not help
  unless the quota fetch itself recovers.

## Evidence

```
src/store/gameStore.ts:432        quota: null
src/store/gameStore.ts:889-892    set only when cloudQuotaResult fulfilled;
                                  rejected -> console.warn, quota stays null

src/hooks/dashboard/useListEditorActions.ts:196-197
  const { quota: currentQuota } = useGameStore.getState();
  const tier = currentQuota?.tier || "free";          // <- the fallback

src/hooks/dashboard/useListEditorActions.ts:114-115   the same two lines
src/hooks/dashboard/useAppHandlers.ts:~150            the same two lines

src/services/quotaService.ts:14-36   getStatus, transcribed:
  5100 cards, tier=premium -> maxCards=5000, usageRatio=1.02 -> "blocked"
  5100 cards, tier=null    -> tier=free, maxCards=1000, usageRatio=5.10 -> "blocked"
```

Both produce `blocked`, but the message renders `status.maxCards`, so the user
sees 1000 instead of 5000 and concludes they are not Premium.

Found while reproducing the Premium card-ceiling P0. It is the mirror image of
that issue: the server is missing a check the client has, and the client
manufactures a check the server correctly omits.

## Fix

Do not fall back to a tier when the tier is unknown. Three options, in
increasing order of work:

1. Refuse the write and say why: if `currentQuota` is null, block with a message
   about connectivity rather than about cards.
2. Fetch the quota as part of the same action that needs it, so the gate cannot
   run against a stale or absent value.
3. Cache the last known quota per user and mark it stale, instead of resetting
   to null on reload.

Option 1 is the smallest change that stops the wrong message. Which one is
wanted is a product call.