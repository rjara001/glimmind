# Reimplementation plan: stored-audio transcription (former transcribeExistingAudio)

**Date:** 2026-10-22
**Priority (folder):** P2
**Status:** Stub — feature removed on 2026-10-22 (U-04); reimplement only if the
product needs "transcribe audio I already recorded" again.

## What was removed

The `transcribeExistingAudio` Cloud Function, its hosting rewrite, the orphan
`transcribeExistingAudioService.js`, the client wrapper in
`src/services/voice/stt/chipttStt.ts` and the unused `SttProvider`
`transcribeExistingAudio` method. The route had zero UI callers and could only
answer 502 (`sttService.sendAudioToGoogleSpeechRecognitionRecognize` never
existed).

## Reimplementation sketch

1. Add a real Recognize-style helper to `sttService` (long audio, non-streaming)
   or reuse `sendAudioToChirpRecognizer` with a higher duration budget.
2. Expose the function with `deriveMeteredAudioSeconds` metering and the
   `CHIPTT_STT_MAX_SINGLE_DURATION` ceiling (U-08 rules apply from day one).
3. Client: restore a typed wrapper in `chipttStt.ts` and a `SttProvider` method
   only when a UI surface (e.g. re-grading a stored recording from the history)
   actually calls it.
4. Tests: emulator repro for the happy path + 429 on over-quota + ceiling 400.
