# Plan: Fix Chiptt STT quota drain, add diagnostic logs, and show 20s recording timer

## Problem
Users reach the 300s monthly STT quota without any successful transcript because quota is deducted before Google STT succeeds. Additionally, there are no diagnostic logs to identify why transcripts fail, and the frontend race condition can send `audioDuration > 60`, causing false "Recording cannot exceed 60 seconds" errors.

## Changes

### 1. `functions/src/services/chipttSttService.js`
- Add detailed logging inside `callGoogleStt`:
  - HTTP status, response body preview
  - `NO_SPEECH` vs `STT_ERROR` vs `RATE_LIMITED`
- Add logging inside `checkAndIncrementQuota`:
  - `uid`, `audioSeconds`, current global/user usage

### 2. `functions/index.js` (`transcribeSpeech`)
- Log `uid`, `audioDuration`, `audioSeconds` at start of request.
- Move quota deduction to AFTER successful transcription:
  - Call `callGoogleStt` first.
  - If successful, THEN call `checkAndIncrementQuota` and return transcript.
  - If any error occurs, do NOT deduct quota.
- Keep existing error codes (`GLOBAL_QUOTA_EXCEEDED`, `USER_QUOTA_EXCEEDED`, `RATE_LIMITED`, `NO_SPEECH`).

### 3. `hooks/useChipttSTT.ts`
- Change `MAX_RECORDING_SECONDS` from `60` to `20`.
- Add visible countdown timer in the recording UI (superpuesto en el componente de grabación/audio, opción A).
- Clamp `audioDuration` to `MAX_RECORDING_SECONDS` before sending to backend:
  - `const audioDuration = Math.max(1, Math.min(Math.ceil(recordingElapsedRef.current), MAX_RECORDING_SECONDS));`

### 4. `services/voice/chipttStt.ts`
- No changes needed; `transcribeSpeech` just forwards options.

## Validation
- Build passes (`npm run build`).
- Deploy `firebase deploy --only functions,hosting`.
- Test flow:
  - Start recording → see 20s countdown overlay.
  - Speak and stop before 20s → transcript returned, quota increased by ~seconds spoken.
  - Let timer expire → recording stops automatically, transcript returned or `noSpeech` handled without quota loss.
  - Simulate `NO_SPEECH` → verify quota NOT deducted.
  - Verify logs contain `uid`, `audioDuration`, `audioSeconds`, and Google STT status.

## Rollback
- Revert `functions/index.js` and `functions/src/services/chipttSttService.js` to previous commit.
- Revert `hooks/useChipttSTT.ts` MAX_RECORDING_SECONDS to 60.
