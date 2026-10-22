# STT metering never reconciles with Google's billed duration

**Date:** 2026-10-22
**Priority (folder):** P2
**Status:** Open — follow-up to the U-08 minimal fix

## What

The U-08 minimal fix (`deriveMeteredAudioSeconds` in
`backend/src/functions/src/routes/sttRoutes.js`) meters seconds from the
payload size heuristic (~4 KB/s), which can no longer be understated by a
client-supplied `audioDuration`. Google's Speech-to-Text response, however,
already returns the real billed duration (`totalBilledDuration` in
`backend/src/functions/src/services/sttService/api.js`), and the metering code
never reconciles against it. Compressed audio (e.g. WebM/Opus) inflates the
size-based estimate; the reverse leaves a small gap on unusual encodings.

## Impact

Metered seconds can over- or under-count the true Google cost by roughly
±20-40% depending on encoding. Bounded (no bypass), but quota UX and cost
attribution stay approximate.

## Evidence

- `backend/src/functions/src/routes/sttRoutes.js` — `deriveMeteredAudioSeconds`
  uses raw byte length only.
- `backend/src/functions/src/services/sttService/api.js` — Google response
  includes `totalBilledDuration`; today it is only logged.

## Fix

True-up after a successful transcription: reserve the estimated seconds up
front (as now), then charge `max(estimate, billedSeconds)` — refunding or
topping up the difference inside `transcribeWithQuota` — so the metered
quantity always matches what Google billed.
