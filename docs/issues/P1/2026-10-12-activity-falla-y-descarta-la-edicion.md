# A failed activity-log call silently discards the user's edit

## What

`ListServiceImpl.updateList` awaits the activity history **before** it writes the
list, and the call is not guarded. If `appendActivity` fails for any reason, the
`await` rejects, `updateList` never runs, and the edit is lost. The only signal
the user gets is a toast reading `Failed to fetch`.

The card write is the primary operation. The activity history is telemetry for
the History view. Ordering them this way lets the secondary one veto the primary.

## Impact

- Every edit from the ListEditor import screen goes through this path, so any
  transient failure of `appendActivity` costs the user their work with no way to
  recover it. The local store is not updated either, because that happens after
  the same await.
- Observed on 2026-10-12 while reproducing the Premium card-ceiling P0: a
  browser session lost a 3-card import this way. `updateList` was never invoked;
  the emulator log shows zero calls to it from the browser.
- The user-facing message is the raw fetch failure, which says nothing about
  what happened or that the edit was dropped.

## Evidence

```
src/services/listService.ts:73-83
  if (input.associations) {
    const events = buildListDiffEvents({ ... });
    await this.activity.recordEvents(existing.userId, events);   // line 80, unguarded
  }

  await this.firestore.updateList(input.id, input);              // line 83, never reached

src/services/activityService.ts:67-69
  await Promise.all(chunks.map((chunk) => callFunction('appendActivity', { userId, events: chunk })))
  // Promise.all rejects on the first failure, so one bad chunk discards the rest

src/hooks/app/useAppHandlers.ts:301-325
  catch -> showToast(errorMessage, "error")
  // the toast renders the raw message, e.g. "Failed to fetch"
```

`appendActivity` itself is healthy. Driven directly against the emulator it
answers `HTTP 200 {"success":true}`, with and without `keepalive`, for 1 chunk
and for 3 concurrent chunks of 3 and of 400 events. The CORS preflight and the
POST response both carry `access-control-allow-origin` for the app origin. So
the failure is on the client side and not yet characterised.

## Fix

Move the `recordEvents` call after the write, and wrap it so a failure is logged
rather than propagated:

```ts
await this.firestore.updateList(input.id, input);

if (input.associations) {
  const events = buildListDiffEvents({ ... });
  try {
    await this.activity.recordEvents(existing.userId, events);
  } catch (error) {
    // the edit is already durable; a missing history entry must not undo it
  }
}
```

Silently swallowing is acceptable only because the write already succeeded and
because `activityService` keeps a local copy when `userId` is absent. If losing
history silently is not acceptable, queue it instead. Which one is a product
call.

The separate finding that the browser-side failure is not yet reproducible from
outside the browser is deliberately left open here rather than guessed at.