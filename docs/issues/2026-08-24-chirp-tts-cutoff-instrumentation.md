# Chirp TTS Cutoff — Instrumentation and Fallback Visibility

Date: 2026-08-24
Status: Instrumented — awaiting runtime evidence
Scope: Chirp TTS path (`useChirpTTS`) plus provider selection (`useSpeechSynthesis`)
Related: [2026-08-24-tts-watchdog-cutoff.md](./2026-08-24-tts-watchdog-cutoff.md)

## Context

The previous issue ([tts-watchdog-cutoff](./2026-08-24-tts-watchdog-cutoff.md)) diagnosed the
watchdog timer as the cause of cutoffs on the **browser** TTS path. The fix (text chunking +
generous per-chunk watchdog) shipped and works for that path.

However, users running the **Chirp** provider still experience phrases being cut short.
Key observation reported during triage:

- At the moment of the cut, the voice is **still Chirp** (natural voice), not the robotic
  browser voice. This rules out the silent browser fallback as the primary cause.

That means the cutoff happens inside the Chirp playback path itself, which had:

- Zero instrumentation (impossible to distinguish external interruption vs. truncated audio).
- A `cleanup()` that silently pauses an actively playing `Audio` element when any code calls
  `cancel()` or starts a new `speak()`.

## Root Cause Candidates (to be discriminated by logs)

| # | Hypothesis | Expected log signature |
|---|---|---|
| H1 | External interruption: something calls `cancel()` or a second `speak()` mid-playback | `[TTS][CHIRP][INTERRUPTED]` with a stack trace pointing at the caller |
| H2 | Truncated audio from Google TTS (backend returns shorter MP3 than expected) | `[TTS][CHIRP][ENDED]` fires normally but `audioDurationMs` is too short for the text |
| H3 | Browser playback failure (decode error, autoplay rejection) | `[TTS][CHIRP][AUDIO_ERROR]` or `[TTS][CHIRP][PLAY_REJECTED]` |
| H4 | Silent fallback to browser (Chirp synthesis failing intermittently: quota, network) | `[TTS][FALLBACK_TO_BROWSER]` followed by browser-path events |

H1 is currently the strongest candidate given the "voice stays Chirp" report.

Known concurrency risks that could trigger H1:

- Two independent `useSpeechSynthesis` instances exist in GameView
  (`GameView.tsx` line ~65 for reveal-answer and the one inside `useGameVoice`). Each has its
  own `useChirpTTS`; a second `speak()` on the same instance cuts the first via `cleanup()`.
- React StrictMode double-mounting can fire cancel/speak storms on entry (dev only).
- The `feedback === 'none'` effect in `useGameVoice` re-invokes `speakCurrentWord()` whenever
  its dependency list changes while idle-speaking.

## Changes Applied

### 1. `src/hooks/voice/tts/useChirpTTS.ts` — full instrumentation

Structured console events mirroring the browser-path convention:

| Event | When it fires | Fields |
|---|---|---|
| `[TTS][CHIRP][START]` | Start of `speak()` | `textLength`, `wordCount`, `voiceId`, `rate`, `pitch` |
| `[TTS][CHIRP][SYNTH_OK]` | After `synthesizeSpeech()` resolves | `elapsedMs`, `audioBytes` (base64 length) |
| `[TTS][CHIRP][PLAY]` | Right before `audio.play()` | `elapsedMs`, `blobSize` |
| `[TTS][CHIRP][ENDED]` | `ended` event (normal completion) | `elapsedMs`, `audioDurationMs` |
| `[TTS][CHIRP][AUDIO_ERROR]` | `error` event on the `Audio` element | `elapsedMs`, `errorCode`, `errorMessage` |
| `[TTS][CHIRP][PLAY_REJECTED]` | `play()` promise rejects | `elapsedMs`, `error` |
| `[TTS][CHIRP][SYNTH_FAIL]` | Synthesis HTTP call throws | `elapsedMs`, `error` |
| `[TTS][CHIRP][INTERRUPTED]` | `cleanup()` runs while audio was actively playing | `playElapsedMs`, **stack** |

Implementation notes:

- `playingSinceRef` tracks whether playback is considered active. It is set just before
  `play()` and cleared by every natural terminal handler (`ended`, `error`, play rejection)
  **before** calling `cleanup()`, so `INTERRUPTED` never false-fires on normal completion.
- The `INTERRUPTED` stack trace identifies who triggered the cleanup: an external `cancel()`
  shows the cancel call chain; a concurrent `speak()` shows the speak call chain.
- Failure results now carry an `error` message string instead of failing silently.

### 2. `src/hooks/voice/tts/useSpeechSynthesis.ts` — honest results and visible fallback

- `SpeakResult` gained two fields:
  - `engine: 'chirp' | 'browser'` (required) — which engine actually produced the audio.
    The `[TTS][DIAG] speak` log previously reported the *configured* provider even when the
    browser fallback spoke; it now reports the truth via this field.
  - `error?: string` — reason carried from the Chirp failure into diagnostics.
- New log when the configured provider cannot deliver audio:

```
[TTS][FALLBACK_TO_BROWSER] { reason, textLength, voiceId }
```

  Emitted in two cases: Chirp synthesis/playback failed (`reason` = error message) or no
  valid Chirp voice could be resolved (`reason: 'no-chirp-voice-resolved'`).

Behavior is otherwise unchanged: the browser fallback chain (chunking + per-chunk watchdog +
single retry) remains exactly as shipped in the watchdog fix.

## How to Reproduce and Classify

1. Run the app with the browser console open.
2. Use voice mode with the Chirp provider until a phrase gets cut.
3. Match the observed sequence against the hypothesis table above:

- `[TTS][CHIRP][INTERRUPTED]` present → concurrency bug (H1). Read the stack: it names the
  offending caller. Likely fixes: single-flight guard in `speak()`, sharing one TTS instance
  across GameView consumers, or guarding the re-entry points listed above.
- `[TTS][CHIRP][ENDED]` with short `audioDurationMs` relative to the text → backend/audio
  truncation (H2). Inspect `sendTextToChirpSynthesizer` output and Google TTS request limits
  for Chirp voices.
- `[TTS][CHIRP][AUDIO_ERROR]` / `[TTS][CHIRP][PLAY_REJECTED]` → playback-layer issue (H3).
- `[TTS][FALLBACK_TO_BROWSER]` before the cut → Chirp is failing upstream (H4); check backend
  function logs for quota (`429`) or Google API errors, and stop degrading silently once fixed.
- `[TTS][CHIRP][PLAY]` logged but no terminal event ever arrives → hung `Audio` element;
  consider adding a safety watchdog to the Chirp path as well (deliberately not added yet to
  avoid reintroducing hard-deadline cutoffs).

Note for local emulator runs: the `synthesizeSpeech` Cloud Function cannot reach Google Cloud
TTS without credentials, so emulator sessions will show `[TTS][CHIRP][SYNTH_FAIL]` followed by
`[TTS][FALLBACK_TO_BROWSER]`. Reproduce against production data to exercise the real Chirp
path.

## Candidate Fixes (Phase 4, pending classification)

1. Single-flight guard: serialize `speak()` calls inside one hook instance so a new utterance
   either queues or explicitly cancels-and-replaces, never races `cleanup()` invisibly.
2. Unify the two GameView `useSpeechSynthesis` instances into one shared instance passed down,
   so game narration and reveal-answer share the same lifecycle.
3. Surface Chirp failures (quota exhausted, service saturated) in the UI instead of silently
   switching engines.
4. Optional: hang watchdog for the Chirp `Audio` element (soft, generous threshold).

## Files Changed

| File | Change |
|---|---|
| `src/hooks/voice/tts/useChirpTTS.ts` | Full event instrumentation, `INTERRUPTED` detection with stack, typed errors |
| `src/hooks/voice/tts/useSpeechSynthesis.ts` | `SpeakResult.engine` + `error` fields, `[TTS][FALLBACK_TO_BROWSER]` logging |

Verification: `tsc --noEmit` clean for modified files; `tests/hooks` suite passing; the 7
pre-existing failures (`SettingsModal`, `grouping`) are unrelated and fail identically without
these changes.
