# Mobile STT Premature Final — Multi-Word Phrases Evaluated on First Word

Date: 2026-08-24
Status: Root cause identified — fix in progress
Scope: Browser-native STT (`window.SpeechRecognition` / `webkitSpeechRecognition`) via `useBrowserSTT`

## Symptom

- **Desktop (Chrome):** Works as expected. The user dictates a multi-word phrase (e.g.
  `"hola mundo"`), the UI displays the full phrase, and validation receives the complete
  sentence.
- **Mobile (Android / iOS):** The UI visually renders the full phrase, but the
  validation logic only receives the **first word** (`"hola"`). Recognition ends
  prematurely, and subsequent `onresult` events containing the rest of the sentence are
  ignored by the consumer.

## Root Cause

Two compounding factors in `src/hooks/voice/stt/useBrowserSTT.ts`:

### 1. Mobile engines emit aggressive `isFinal: true` events

Desktop Chrome typically accumulates tokens and only emits a final result after detecting
a long pause (the engine considers the entire phrase as one final chunk). Mobile speech
engines (particularly Android WebView) emit `onresult` events aggressively: individual
words or small fragments arrive already marked `isFinal: true`.

Example mobile event sequence for `"hola mundo"`:

```
onresult  event 1: results = [{ isFinal: true, transcript: "hola" }]
onresult  event 2: results = [{ isFinal: true, transcript: "hola" }, { isFinal: true, transcript: " mundo" }]
```

### 2. `onresult` fires `onFinal` immediately per-event

The handler at `useBrowserSTT.ts` (original lines 238–264) iterates from
`event.resultIndex` and calls `onFinalRef.current(final.trim())` on **every** event that
contains final results:

```typescript
instance.onresult = (event) => {
  armInactivityWatchdog(instance);

  let interim = '';
  let final = '';

  for (let i = event.resultIndex; i < event.results.length; i += 1) {
    const result = event.results[i];
    const alternative = result && result[0];
    const transcript = alternative?.transcript ?? '';

    if (result.isFinal) {
      final += transcript;
    } else {
      interim += transcript;
    }
  }

  if (interim) {
    onInterimRef.current?.(interim);
  }
  setInterimTranscript(interim);

  if (final) {
    onFinalRef.current(final.trim());  // ← fires prematurely on mobile
  }
};
```

When event 1 arrives with `isFinal: true` for `"hola"`, `onFinal("hola")` is called at
once.

### 3. Consumer assumes `onFinal` = complete utterance

The consumer `useGameVoice.ts` (lines 168–206) treats the first `onFinal` callback as the
complete spoken answer:

```typescript
onFinal: (text) => {
  const trimmed = text.trim();
  if (!trimmed || answerHandledRef.current) return;  // ← ignores subsequent calls

  setTranscript(trimmed);
  // ... immediately evaluates and advances
  if (phaseRef.current === 'listening' && !revealedRef.current) {
    setPhaseBoth('evaluating');
    onSubmitVoiceRef.current(trimmed);  // evaluates "hola" as the answer
  }
}
```

Because `answerHandledRef.current` becomes `true` after the first evaluation (or via
interim early-match), all subsequent `onresult` events — which carry the rest of the
phrase — are silently discarded.

## Affected Files

| File | Role |
|---|---|
| `src/hooks/voice/stt/useBrowserSTT.ts` | STT hook — **root cause** (onresult + onend) |
| `src/hooks/voice/stt/useSTT.ts` | Provider router — no change |
| `src/hooks/voice/stt/useSpeechRecognition.ts` | Provider router — no change |
| `src/hooks/voice/useGameVoice.ts` | Consumer — guarded; no change needed (relies on hook emitting complete `onFinal`) |
| `src/hooks/voice/useVoiceSession.ts` | Consumer (Voice Study Mode) — guarded; no change needed |
| `tests/hooks/useSpeechRecognition.test.ts` | Tests — will be updated |

## Proposed Fix

A two-part change inside `useBrowserSTT.ts` only:

### Part A — Rebuild final from index 0 + accumulate in a ref

Instead of iterating from `event.resultIndex`, iterate from `0` over the **entire**
`event.results` array on every `onresult` event. Concatenate all `isFinal: true` results
to reconstruct the **complete accumulated phrase**. Store the result in a ref
(`accumulatedFinalRef`) rather than computing it transiently.

This works because the Web Speech API `results` array grows within a session — each new
event appends results, and iterating from 0 on every event reconstructs the full
accumulated text without double-counting (a result that is `isFinal` stays final).

### Part B — Debounced `onFinal` emission + `onend` safety net

Do **not** call `onFinal` directly inside `onresult`. Instead:

1. **Debounce:** each time new final content is detected, (re)start a
   `FINAL_DEBOUNCE_MS` (500 ms) timer. When the timer fires — i.e., no new results have
   arrived for 500 ms, indicating the user has stopped speaking mid-phrase or the engine
   has emitted a premature final — emit the accumulated transcript via `onFinal` and clear
   the buffer.

2. **`onend` safety:** when the recognition session ends (mobile engines cut every 3–10 s
   and restart), if the debounce timer hasn't fired yet but `accumulatedFinalRef` has
   content, emit it immediately before the restart logic proceeds.

3. **Clear buffer on each `start()`:** a new recognition session begins fresh; the
   accumulator is reset.

## Expected Behaviour After Fix

```
Mobile: user says "hola mundo"

onresult  event 1: [{ final: "hola" }]          → accumulatedFinalRef = "hola",         timer started
onresult  event 2: [{ final: "hola" }, { final: " mundo" }] → accumulatedFinalRef = "hola mundo", timer reset
(500 ms silence)
debounce fires → onFinal("hola mundo")         → consumer evaluates complete phrase ✓
onend fires → buffer empty, nothing to emit → restart for next turn
```

```
Desktop: user says "hola mundo"

onresult  event 1: [{ final: "hola mundo" }]    → accumulatedFinalRef = "hola mundo",  timer started
(500 ms silence)
debounce fires → onFinal("hola mundo")         → consumer evaluates complete phrase ✓
```

## Validation Plan

1. Add a unit test simulating mobile behavior: multiple `onresult` events where each word
   arrives as `isFinal: true` individually — assert `onFinal` fires exactly **once** with
   the **complete** phrase after the debounce window.
2. Update the existing `onFinal` test to account for the debounce (use `vi.useFakeTimers()`).
3. Add a test verifying `onend` emits accumulated final when debounce hasn't fired.
4. Run `npx tsc --noEmit` and `npm run test`.
