# TTS Watchdog Cutoff — Phrases Cut Short at the End

Date: 2026-08-24
Status: Diagnosed
Scope: Browser-native TTS (`window.speechSynthesis`) via `useSpeechSynthesis`

## Symptom

When the machine speaks a phrase or word, the audio is cut off before it finishes.
Users hear an abrupt stop, typically near the end of the utterance. The UI may briefly
show a speaking state and then jump back to idle/listening without the phrase completing.

## Root Cause

The culprit is the **watchdog timer** in `src/hooks/voice/tts/useSpeechSynthesis.ts`
(lines 305–321).

```typescript
const estimatedMs =
  Math.max(
    8000,
    Math.min(
      20000,
      text.split(/\s+/).length * 1200 + 2000
    )
  );

watchdogTimer = setTimeout(() => {
  synth.cancel();
  settle(false);
}, estimatedMs);
```

### What the watchdog does

1. Before calling `synth.speak(utterance)`, the hook starts a timer (`watchdogTimer`).
2. It calculates `estimatedMs` from the number of words in the text.
3. If the `SpeechSynthesisUtterance` does not fire `end` or `error` within that time,
   the watchdog calls `synth.cancel()` and resolves the promise with `ok: false`.
4. On failure, the hook retries once after `WATCHDOG_RETRY_DELAY_MS` (300 ms) using the
   **same estimation formula**.

## Why the estimation is wrong

The formula `wordCount * 1200 ms + 2000 ms` assumes an average speaking rate, but it
ignores several runtime factors:

| Factor | Impact |
|---|---|
| **Voice rate (`utterance.rate`)** | A slower rate (e.g. `0.8`) stretches the same text beyond the estimate. A faster rate (`1.3`) shortens it. The watchdog does not account for this. |
| **Word length / syllable count** | Long or polysyllabic words take longer than the per-word average. Phrases with many such words systematically exceed the estimate. |
| **Language rhythm** | Languages have different natural cadences. Spanish, Japanese, or German can be slower than the implicit English-average baked into `1200 ms`. |
| **Browser / OS voice engine** | `speechSynthesis` behavior varies across Chrome, Edge, and Safari. Some voices introduce longer pauses or slower enunciation. |
| **Utterance queue state** | If the browser queues or throttles speech synthesis (a known Chrome behavior after ~15 s of continuous speech), the effective start is delayed, eating into the estimate. |

Because the estimate is static, any combination of the above that pushes the real
duration above `estimatedMs` triggers the watchdog. The cancellation happens silently,
so the user only sees the phrase stop mid-sentence.

## Failure flow

```
User requests TTS for a phrase
  ↓
speakOnce() calculates estimatedMs = 14 s
  ↓
synth.speak(utterance) starts
  ↓
Real speech takes 17 s (slow rate + long words)
  ↓
After 14 s: watchdogTimer fires
  ↓
synth.cancel() → utterance is cut off
  ↓
settle(false) → speak() resolves with ok: false
  ↓
Hook waits 300 ms and retries with the same formula
  ↓
Phrase is cut off again (same miscalculation)
```

## Reproduction hints

- Use a slower `voiceRate` (e.g. `0.7`–`0.9`) in settings.
- Speak long phrases or sentences with many syllables.
- Use languages with slower natural pacing (e.g. Japanese `ja`, German `de`).
- Observe the console warning:
  ```
  [TTS][DIAG] speak { provider, text, voiceId, rate, pitch, result: { ok: false } }
  ```

## Recommended fixes

1. **Scale the estimate by `rate`**
   ```typescript
   const adjustedRate = rate ?? 1;
   const estimatedMs = Math.max(
     8000,
     Math.min(
       20000,
       (text.split(/\s+/).length * 1200 + 2000) / adjustedRate
     )
   );
   ```

2. **Make the watchdog a soft safety net, not a hard deadline**
   - Increase the multiplier (e.g. `* 1.5` or `* 2`) so only genuinely hung utterances
     are cancelled.
   - Prefer letting the utterance finish naturally over cutting it off.

3. **Chrome long-utterance workaround**
   - Chrome may throttle or pause `speechSynthesis` after ~15 s of continuous speech.
   - Split long texts into shorter segments and speak them sequentially instead of
     relying on a single long utterance.

4. **Use `end`/`error` as the source of truth**
   - The `end` event already signals successful completion.
   - The watchdog should only catch the rare case where the engine hangs, not replace
     duration prediction.

## Instrumentation applied (verification phase)

Modified file: `src/hooks/voice/tts/useSpeechSynthesis.ts`

Added structured `console.log` events with `performance.now()` timing so the exact
sequence can be reconstructed from the browser console.

### New log events

| Event | When it fires | Fields |
|---|---|---|
| `[TTS][START]` | Start of `speakOnce()` | `provider`, `text`, `wordCount`, `rate`, `pitch`, `estimatedMs`, `voiceId` |
| `[TTS][CLEAR_QUEUE]` | Immediately before `synth.cancel()` inside `speakOnce()` | *(none)* |
| `[TTS][SPEAK]` | Just before `synth.speak(utterance)` | `elapsedMs`, `voiceName` |
| `[TTS][END]` | Utterance `end` event | `elapsedMs`, `voiceName` |
| `[TTS][ERROR]` | Utterance `error` event | `elapsedMs`, `eventType`, `error`, `voiceName` |
| `[TTS][WATCHDOG]` | Watchdog timer fires | `elapsedMs`, `estimatedMs`, `voiceName` |
| `[TTS][RETRY]` | Before second `speakOnce()` attempt | `provider`, `text`, `voiceId`, `rate`, `pitch`, `firstResult` |
| `[TTS][CANCEL]` | `cancel()` called externally | `speaking` (boolean from `speechSynthesis.speaking`) |

### Example log sequences

**Watchdog cutoff:**
```
[TTS][START] { provider: "browser", text: "...", wordCount: 12, rate: 0.8, estimatedMs: 16000, voiceId: "..." }
[TTS][CLEAR_QUEUE]
[TTS][SPEAK] { elapsedMs: 52, voiceName: "..." }
[TTS][WATCHDOG] { elapsedMs: 16012, estimatedMs: 16000, voiceName: "..." }
```

**Normal completion:**
```
[TTS][START] { ..., rate: 1, estimatedMs: 14000 }
[TTS][CLEAR_QUEUE]
[TTS][SPEAK] { elapsedMs: 50 }
[TTS][END] { elapsedMs: 14230 }
```

**Engine error:**
```
[TTS][START] { ... }
[TTS][SPEAK] { elapsedMs: 48 }
[TTS][ERROR] { elapsedMs: 1200, eventType: "error", error: "canceled", voiceName: "..." }
```

**External cancel:**
```
[TTS][CANCEL] { speaking: true }
[TTS][END] { elapsedMs: 3400 }
```
or
```
[TTS][CANCEL] { speaking: true }
[TTS][ERROR] { elapsedMs: 3400, eventType: "error", error: "canceled", voiceName: "..." }
```

### What to look for in the console

1. **If `[TTS][WATCHDOG]` appears:** the watchdog is directly causing the cutoff.
   Compare `elapsedMs` with `estimatedMs` — they will be very close.
2. **If `[TTS][END]` appears but `elapsedMs > estimatedMs`:** the watchdog did NOT fire,
   but the utterance still finished. This suggests a different cause (or a previous
   watchdog cut an earlier attempt and the retry succeeded).
3. **If `[TTS][ERROR]` appears:** the browser engine itself aborted the utterance.
   Check the `error` field. `"canceled"` usually means something called `cancel()`
   externally or the watchdog fired before the error event could be logged.
4. **Correlate `rate`:** if failures only happen when `rate < 1`, and `elapsedMs` is
   consistently close to `estimatedMs`, the formula is underestimating for slower rates.

---

## All `speechSynthesis.cancel()` call sites

Static audit of the codebase for any call that can terminate a Browser TTS utterance.

### Inside `useSpeechSynthesis.ts` (the TTS hook itself)

| Line | Function | Context | Can cut active utterance? |
|---|---|---|---|
| 171 | `speakOnce()` | Clears the queue before starting a new utterance | **No** — runs before `synth.speak()` |
| 351 | Watchdog timer | Fires when `elapsedMs >= estimatedMs` | **Yes** — this is the primary suspected cause |
| 414 | `cancel()` | Public method, called from outside the hook | **Yes** — interrupts any in-progress utterance |

### Outside `useSpeechSynthesis.ts` (callers of `tts.cancel()`)

| File | Line(s) | Function | When it runs | Can cut active utterance? |
|---|---|---|---|---|
| `src/hooks/voice/useGameVoice.ts` | 351, 361 | `useEffect` cleanup for `enabled` | When voice mode is disabled or component unmounts | **Yes** — but these are lifecycle events, not mid-speech |
| `src/hooks/voice/useGameVoice.ts` | 490 | `stop()` callback | User presses stop button | **Yes** — intentional user action |
| `src/hooks/voice/useVoiceSession.ts` | 299 | `stop()` callback | User stops voice session | **Yes** — intentional user action |
| `src/hooks/voice/useVoiceSession.ts` | 320 | `useEffect` cleanup on unmount | Component unmounts | **Yes** — but only during teardown |

### Other TTS-terminating APIs

- **`speechSynthesis.pause()` / `synth.pause()`**: not used anywhere in the codebase.
- **`speechSynthesis.resume()`**: used only in `useSpeechSynthesis.ts` lines 108 (`unlock()`) and 172 (`speakOnce()`).
- **No direct DOM audio manipulation** for Browser TTS (Chirp uses `Audio` blob in `useChirpTTS.ts`, unaffected).

---

## Termination paths for `speakOnce()`

A single invocation of `speakOnce()` can end via exactly **4 paths**:

| # | Path | Trigger | `settled` set by | Promise resolves | Log emitted |
|---|---|---|---|---|---|
| 1 | Normal completion | Browser fires `utterance.end` | `onDone` | `{ ok: true }` | `[TTS][END]` |
| 2 | Engine error | Browser fires `utterance.error` | `onError` | `{ ok: false }` | `[TTS][ERROR]` |
| 3 | Watchdog timeout | `setTimeout` reaches `estimatedMs` | Watchdog callback | `{ ok: false }` | `[TTS][WATCHDOG]` |
| 4 | External cancel | `cancel()` called from parent hook | Watchdog callback (after `synth.cancel()`) | `{ ok: false }` | `[TTS][CANCEL]` + `[TTS][END]` or `[TTS][ERROR]` |

### How to distinguish each path from logs

- **Path 1 (success):** `[TTS][START]` → `[TTS][SPEAK]` → `[TTS][END]`. No `[TTS][WATCHDOG]`, no `[TTS][ERROR]`.
- **Path 2 (engine error):** `[TTS][START]` → `[TTS][SPEAK]` → `[TTS][ERROR]`. The `error` field in the log will contain the browser error code. No `[TTS][WATCHDOG]`.
- **Path 3 (watchdog):** `[TTS][START]` → `[TTS][SPEAK]` → `[TTS][WATCHDOG]`. **No** `[TTS][END]` or `[TTS][ERROR]` follows, because `settled=true` removes the event listeners before they can fire. The `elapsedMs` in `[TTS][WATCHDOG]` will be within a few milliseconds of `estimatedMs`.
- **Path 4 (external cancel):** `[TTS][CANCEL]` appears first (from the parent hook). Then the utterance fires either `[TTS][END]` or `[TTS][ERROR]` with a much smaller `elapsedMs` than `estimatedMs`.

### Edge case: retry masking the cause

If `speakOnce()` returns `ok: false`, the outer `speak()` waits 300 ms and retries.
The retry may succeed (`ok: true`) even when the first attempt was cut by the watchdog.
The `[TTS][RETRY]` log shows `firstResult`, so you can see whether the first attempt
failed and why. If the retry also fails with the same pattern, the second `[TTS][WATCHDOG]`
will appear, confirming the watchdog as the root cause.

---

## Current status

- **Diagnosis:** complete. The watchdog timer is the most likely cause of cutoff.
- **Instrumentation:** applied. Logs are now in place to confirm or refute the hypothesis.
- **Code changes:** only `useSpeechSynthesis.ts` was modified. No changes to Chirp, `useGameVoice`, `useVoiceSession`, or any other file.
- **Next step:** reproduce the issue in the browser, capture the console output, and analyze whether `[TTS][WATCHDOG]` appears in the failing cases. If it does, the fix will involve adjusting the watchdog formula or philosophy. If it does not, investigate `[TTS][ERROR]` or external `[TTS][CANCEL]` paths.
- **Follow-up:** the browser-path fix shipped (chunking + generous per-chunk watchdog). Cutoffs reported while using the Chirp provider are tracked separately in
  [2026-08-24-chirp-tts-cutoff-instrumentation.md](./2026-08-24-chirp-tts-cutoff-instrumentation.md).

---

## Files involved

| File | Role |
|---|---|
| `src/hooks/voice/tts/useSpeechSynthesis.ts` | Watchdog timer and `speakOnce()` implementation — **instrumented** |
| `src/hooks/voice/tts/useChirpTTS.ts` | Chirp provider path (audio blob playback — unaffected by this browser watchdog) |
| `src/hooks/voice/useGameVoice.ts` | Calls `tts.speak()` and `tts.cancel()` for current word, answer, and feedback phrases |
| `src/hooks/voice/useVoiceSession.ts` | Calls `tts.speak()` and `tts.cancel()` for the dedicated voice study session |
