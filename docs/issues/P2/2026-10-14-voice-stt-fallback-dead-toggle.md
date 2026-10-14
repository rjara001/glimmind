# `voiceSttFallback` toggle is written but never read

**Date:** 2026-10-14
**Priority:** P2
**Status:** Not fixed

## What

The "Fallback de reconocimiento de voz" switch in `SettingsView` writes
`settings.voiceSttFallback`, but no code ever reads it. A repo-wide search for
`voiceSttFallback` returns only the type declarations and the SettingsView
lines that write it.

## Impact

The setting is dead: users believe they are configuring a 3-attempt fallback to
cloud transcription when the flag changes nothing. It also misleads anyone
auditing the voice stack, because the toggle looks like a live gate on a metered
API (cloud transcription is Premium-only per
[`../../BUSINESS_MODEL.md`](../../BUSINESS_MODEL.md) §4).

## Evidence

```
src/types/settings.ts:4,12       field + default
src/types.ts:59                  ListSettings.voiceSttFallback?
src/components/views/SettingsView.tsx:128   setSettings(...) write
src/components/views/SettingsView.tsx:320-342  toggle UI

grep -rn "voiceSttFallback" src  -> 7 hits, all of the above, 0 readers
```

## Fix

Decide whether the fallback behaviour exists elsewhere under another name. If
it does, delete the toggle. If it does not, either implement the fallback (it
must then be Premium-gated, since it calls cloud transcription) or remove the
UI. That product decision belongs in
[`../../BUSINESS_MODEL.md`](../../BUSINESS_MODEL.md), not here.
