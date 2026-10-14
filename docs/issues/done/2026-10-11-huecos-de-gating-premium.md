# Paid features reachable from the free tier

**Resolved:** 2026-10-14, by
[`../../plans/2026-10-14-premium-voice-gating.md`](../../plans/2026-10-14-premium-voice-gating.md).
Chirp 3 HD and Chiptt are hidden for free accounts, coerced to `browser` at
every voice call site, and rejected server-side (`TIER_REQUIRED`, HTTP 403) —
the free allowance is now 0 chars / 0 s instead of 5 000 / 3 000. The audio
recording toggle in Settings is disabled for free accounts, the handler guards
stale clicks, and `useGameVoice` only records when the tier is premium.
Verified by `tests/services/meteredQuota.test.ts`,
`src/services/voice/effectiveProviders.test.ts`,
`tests/components/SettingsView.test.tsx` and
`tests/components/modals/settings/`.

## What

Two paid capabilities can be reached without a Premium subscription. Both spend
money per the inventory in [`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md) §3.

1. **Chirp 3 HD and Chiptt are offered to every user.** The voice selector lists
   them with no tier check anywhere in the component. Only a monthly quota stops
   them.
2. **The audio-recording toggle in Settings has no tier check.** It writes
   `settings.audioRecordingEnabled`, which makes `useGameVoice` record every
   answer and upload the blob to Firebase Storage.

## Impact

The "Grabar Voz" button in `SessionBar` is gated to Premium, but gating the
button in the session bar does nothing: the Settings toggle still enables the
same recording path, and storage cost accrues for free users.

Chirp 3 at the current free quota (5,000 chars/month) is also consumed very
quickly in voice mode, because TTS is called on every correct and incorrect
answer. A free user gets a degraded experience *and* generates cost.

## Evidence

```
components/modals/settings/VoiceSection.tsx:125   { value: 'chirp', label: 'Chirp 3 HD' }
   -> no isPremium check anywhere in the file
components/views/SettingsView.tsx:294-308          recording toggle, no tier guard
hooks/voice/useGameVoice.ts:383-393               records on every answer
services/audioService.ts:25-29                    uploads to Firebase Storage
```

## Fix

Depends on the plan design, which is recorded in
[`../BUSINESS_MODEL.md`](../BUSINESS_MODEL.md) §4. Under Rule 0 the cloud voice
engines and cloud transcription are Premium-only, so:

- hide the `chirp` and `chiptt` options when the account is not Premium, and
- disable the recording toggle with a message pointing at the upgrade.

The mechanical gap — a tier check missing where one exists for everything else —
is independent of that decision and can be closed either way.