# `transcribeExistingAudio` calls a function that does not exist

## What

The route handler calls `sttService.sendAudioToGoogleSpeechRecognitionRecognize`.
No such export exists. `sttService/api.js` exports exactly two callables,
`sendAudioToChirpRecognizer` and `sendAudioToGoogleSpeechRecognition`, and
`sttService/index.js` re-exports those two.

Calling `undefined(...)` throws a `TypeError`, which the surrounding catch turns
into a 502. The endpoint cannot succeed.

Nothing calls it. `useChipTTSTT.ts` defines a local callback also named
`transcribeExistingAudio`, but that one invokes `transcribeSpeech`, not this
endpoint, and `chipttStt.ts` exports the endpoint wrapper to nobody.

## Impact

- The endpoint always answers 502. Recording audio for a word
  (`SERVICE_CATALOG.md` §3) is reachable only through the `transcribeSpeech`
  path; this second route is unreachable dead weight.
- The quota reservation added on 2026-10-12 makes this worse than it looks: the
  request now reserves STT seconds, fails on the `TypeError`, and is refunded,
  so it costs nothing — but it is a live route in `firebase.json` and in
  `index.js` that can only ever fail.

## Evidence

```
routes/sttRoutes.js:86          sttService.sendAudioToGoogleSpeechRecognitionRecognize(audioContent, languageCode)
services/sttService/api.js:84   module.exports = { sendAudioToChirpRecognizer, sendAudioToGoogleSpeechRecognition };
services/sttService/index.js:20 sendAudioToChirpRecognizer, sendAudioToGoogleSpeechRecognition,

$ grep -rn "sendAudioToGoogleSpeechRecognitionRecognize" backend/src/functions/src
routes/sttRoutes.js:86          # the call, no definition

$ grep -rn "transcribeExistingAudio" src/
src/services/voice/stt/chipttStt.ts:36   # exported, imported by nobody
```

## Fix

Either delete the route plus its `firebase.json` rewrite and its client wrapper,
or point it at `sendAudioToChirpRecognizer`, which is what the dead
`transcribeExistingAudioService.js` already does. Deleting is the better fit:
the capability is covered by `transcribeSpeech`, and the sibling issue
`P1/2026-10-12-stt-audio-seconds-no-verificar.md` covers the metering gap on
that path.