# STT meters seconds the client declares, not the audio it sends

## What

`sttRoutes.js` derives `audioSeconds` — the quantity the monthly quota is
charged on — from `audioDuration`, a number the client sends in the request
body. The server never measures the audio it receives, so the metered quantity
and the billed quantity are independent.

The same two lines also skip the duration ceiling on one of the three routes:
`transcribeSpeech` and `transcribeChirp3` reject recordings over
`CHIPTT_STT_MAX_SINGLE_DURATION` (60s) using the *client's* number, and
`transcribeExistingAudio` has no ceiling at all.

## Impact

- A client can send `audioDuration: 1` alongside a 60-second recording and be
  charged 1 second. The STT allowance is 3 000 s/month free, so 3 000 such
  requests are free while Google bills all of them.
- Conversely `audioDuration: 9999` makes the route reject a request that costs
  one second, so a user can lock themselves out with a wrong value.
- `transcribeExistingAudio` accepts an unbounded payload: the 60-second cap the
  other two routes enforce never runs on it.
- This is unrelated to atomicity. The 2026-10-12 quota work made the counter
  correct; the quantity being counted is still whatever the client asked for.

## Evidence

```
routes/sttRoutes.js:28  const audioSeconds = Math.max(1, Math.ceil(audioDuration || (Buffer.from(audioContent,'base64').length / 4000)));
routes/sttRoutes.js:29  if (audioDuration > CHIPTT_STT_MAX_SINGLE_DURATION) {   // trusts the client
routes/sttRoutes.js:80  // transcribeExistingAudio: no ceiling at all

services/voice/stt/chipttStt.ts:18   audioDuration?: number;   // typed as optional, client-supplied
hooks/voice/stt/useChipTTSTT.ts:242  audioDuration: Math.max(1, Math.ceil(elapsed))
```

## Fix

Derive the metered seconds from the decoded audio on the server — duration from
the container header, or a size-based estimate that cannot be understated by
under-reporting `audioDuration` — and apply `CHIPTT_STT_MAX_SINGLE_DURATION` to
that derived value on all three routes. Treat `audioDuration` from the client as
a hint for the UI only, never as the billed quantity.