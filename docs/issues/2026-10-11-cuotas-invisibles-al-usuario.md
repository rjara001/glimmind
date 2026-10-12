# Users cannot see their limits before hitting one

**Date:** 2026-10-11
**Priority:** P2
**Status:** Not fixed — how much to surface is a product decision

## What

Four metered limits exist (AI decks, cloud voice, cloud transcription,
translation). The only one visible anywhere is a percentage, and only inside the
YouTube deck modal. The absolute numbers are never shown. The point cost of a deck
is never shown either.

## Impact

A user sees "40 términos" and cannot know it costs 30 of their 1000 daily points.
The cost appears only in the rejection message. Voice, transcription and
translation limits appear only as a 429 after the attempt.

Meanwhile the limit users *do* see in Settings is `cardCount/cardQuota` — which
controls no cost at all, since Firestore storage is cents (see
[`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md) §1).

The practical effect is that a Premium customer cannot tell what they paid for
until they exhaust something.

## Evidence

```
components/views/SettingsView.tsx:202-206   shows only {cardCount}/{cardQuota} tarjetas
components/modals/CreateYouTubeDeckModal.tsx:73-95  shows % remaining, never the absolute limit
components/modals/CreateYouTubeDeckModal.tsx:11-16   express/standard/extended/massive with no costPercent
components/list-editor/ListEditorTranslationBar.tsx:18  only renders when cards are selected
```

The `DECK_TIERS` cost table (`utils/constants.js:9-14`) is duplicated in the
frontend modal with no drift test, unlike `plans.json` which has one.

## Fix

Depends on the plan design in [`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md).
Whatever the final numbers are, the mechanical gaps worth closing independently:

- show the absolute limit next to the percentage, and
- show the point cost on each deck-size button.

`DECK_TIERS` also needs the same drift guard `plans.json` already has, so the
two copies cannot diverge.