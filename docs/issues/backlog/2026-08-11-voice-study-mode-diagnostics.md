# Voice Study Mode — Diagnostics

Status: In Progress
Date: 2026-08-11
Scope: Voice study mode MVP (multi-session debugging)

## Objective

Get the voice study mode working end to end: TTS pronounces the word, STT captures
the spoken answer, evaluation advances the card. This doc records what is resolved,
the open bugs, and the exact next steps — so the work can be resumed without
re-diagnosing from scratch.

## Resolved and verified

- **Mount-time sync killed in voice mode.** The `onUpdateAssociations` effect in
  `VoiceGameView.tsx` now compares against a `lastSyncedAssociationsRef` snapshot and
  skips no-op updates. Verified via console: `[SYNC] guard check: same= true`.
- **STT "reused instance" bug fixed.** `useSpeechRecognition` creates a fresh
  `SpeechRecognition` instance per `start()` and destroys the previous one
  (Chrome desktop goes mute when the same instance is reused after `abort()`/`onend`).
- **TTS watchdog.** `useSpeechSynthesis.speak()` resolves even if Chrome never fires
  `end`/`error` (estimated duration + cancel fallback). The game flow can no longer
  hang on "Hablando…".
- **`unlock()` no longer speaks an empty utterance.** The previous
  `speak(new SpeechSynthesisUtterance(''))` is a known Chrome queue-hanger; now it
  only calls `speechSynthesis.resume()`.
- **STT onstart watchdog.** If `start()` returns OK but `onstart` never fires within
  3.5s, the hook logs `[STT] onstart never fired after start()` and surfaces a
  Spanish message in the UI instead of hanging silently.
- **Instrumentation added** (console tracing):
  - `[SYNC] guard check: same= true|false` — mount sync guard status.
  - `[VOICE] concept= <concept> flipOrder= … ttsLang= … sttLang= …` — language resolution.
  - `[VOICE] runCard / tts.speak start / tts.speak resolved / calling stt.start lang=` — flow trace.
  - `[TTS] end | error <code> | watchdog timeout, cancelling` — synthesis outcome.
  - `[STT] constructor found= / start called lang= / start returned ok / started / onstart never fired` — recognition outcome.

## Fixes applied (code)

### 1. `sttLang` / `ttsLang` resolve to `null` for list "Test1"  — FIXED (code)

- Root cause: `resolveLanguages` returned the raw `detectLanguage()` result, so an
  unrecognised concept (e.g. opaque `Test1` concept, or `"Valor 1 / Español"` where
  `Valor 1` is not a language label) yielded `null` for one/both languages.
- Fix applied in `services/voice/languages.ts`: `resolveLanguages` now uses a two-tier
  fallback instead of returning `null`:
  1. an unrecognised side adopts the **recognised side's** language (handles
     `"Valor 1 / Español"` → `es`), and
  2. if neither side resolves, falls back to `DEFAULT_VOICE_LANGUAGE = 'es'`
     (app is Spanish-first UI / STT error messages).
- `detectLanguage` itself is unchanged (still returns `null` for `"Valor 1"`); only
  the resolution layer falls back. No whitespace split introduced (kept `/`-only, per
  the reverted attempt).
- Tests updated in `services/voice/languages.test.ts` (10 passing). `detectLanguage('Valor 1') → null` preserved.
- Side effect: this also addresses the primary vector of bug #2 (null lang → no voice set).

## Resolved and verified (runtime run 2026-08-11 15:49)

- **Mount-time sync killed in voice mode.** `VoiceGameView.tsx:18-28` guard vs `lastSyncedAssociationsRef`. Verified `[SYNC] guard check: same= true`.
- **STT "reused instance" bug fixed** — fresh `SpeechRecognition` per `start()`, previous destroyed.
- **TTS watchdog** resolves the promise even without `end`/`error`.
- **`unlock()` only `resume()`s** (no empty utterance).
- **STT onstart watchdog** (3.5s) surfaces mic issues.
- **Bug #1 — `null` languages:** fixed in code, verified in run —
  `[VOICE] concept= Valor 1 / Valor 2 ... ttsLang= es sttLang= es` (no longer `null`).
- **Bugs #2 + #3 (TTS `canceled` + mic never starts):** unified root cause, fixed in code —
  see `### 2 & 3` below.

### 2 & 3. TTS `error canceled` + mic never activates — unified root cause — FIXED (code)

- Observed in run: `[TTS] error canceled` (×2), `[STT] start returned ok` but **no
  `[STT] started`, no `[STT] error`, no `[STT] onstart never fired`**.
- Root cause: `useVoiceSession.ts` had a cleanup `useEffect(..., [stt, tts])`, but both
  `useSpeechSynthesis` and `useSpeechRecognition` return a **new object literal on every
  render**. The cleanup therefore re-ran on **every re-render**, calling:
  - `tts.cancel()` → `speechSynthesis.cancel()` mid-utterance → `error: canceled`
    (no `[TTS] end`, no watchdog timeout, because the external cancel fired first);
  - `stt.abort()` → `destroyInstance()` + `clearTimeout(startWatchdogRef)` → the
    recognition instance was destroyed and its watchdog cleared **before** `onstart` could
    fire → hence `started`/error/onstart-never-fired were all absent.
- Why only voice mode: normal `Study` uses `GameView` + `useGameStore`, not these hooks.
- Fix: stabilize the cleanup deps to the `useCallback`-stable methods
  `[stt.abort, tts.cancel]` so the cleanup runs on **unmount only**. Now `setIsSpeaking(true)`
  re-renders during `tts.speak` no longer abort the session, and `setPhase('listening')`
  no longer kills the just-started STT.
- Files: `hooks/useVoiceSession.ts:65-75`.
- Still runtime-gated: whether the browser has granted mic permission. Expected next-run
  logs after fix:
  - `[TTS] end` (no `[TTS] error canceled`), or `[TTS] watchdog timeout, cancelling`
    only if a real utterance overruns the estimate;
  - `[STT] started es` (mic active) **or** `[STT] onstart never fired after start()` + the
    Spanish lock-icon message (permission pending/denied).

## Preexisting store bug (DO NOT touch — user decision)

- `store/gameStore.ts:683-691`: `syncToCloud` calls `listService.updateList(...)`
  when the cloud list is missing, but `updateList` requires the list to exist →
  `404 {"error":"List not found"}`. It should call `createList`.
- This is preexisting and also affects normal Study mode (`GameView.tsx:74` mount
  effect). It is NOT the cause of the mic issue.
- Aggravating factor: list "Test1" has **4318 associations** → every sync attempts a
  ~1MB upload that 404s.

## Next steps (runtime validation)

1. Hard reload + PLAY; capture fresh logs.
2. Confirm `[TTS] end` (no `error canceled`) and `[STT] started es` now appear.
3. If `[STT] onstart never fired after start()` appears → grant mic permission (lock icon
   in the address bar / reset for the origin), then replay.
4. If `[TTS] error canceled` or mic still fails to start → regression; re-open bugs #2/#3.
5. Validate end-to-end correct/incorrect flow, then remove instrumentation logs.
6. Decide with the user: fix the `syncToCloud` create-vs-update bug, or keep it masked.
