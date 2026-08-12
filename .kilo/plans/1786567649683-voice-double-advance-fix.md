# Fix: Voice Mode Double `handleCorrect()` Causes Premature Card Advancement & TTS Failure

## Problem

When the user is in integrated Game Voice mode (GameView + voice enabled) and speaks a
correct answer, the card advances **immediately** without showing feedback, the next card's
TTS fails with `"No se pudo reproducir el audio de voz"`, and the session auto-advances
again before the user can answer.

## Root Cause

Two independent code paths call `actions.handleCorrect()` when `feedback === 'correct'` in
voice mode:

1. `useGameVoice` (`hooks/useGameVoice.ts:222-230`): starts a 1300 ms timer → calls
   `onAdvance()` (= `actions.handleCorrect()`) after the delay. **Intended.**
2. `GameView` inline `useEffect` (`components/GameView.tsx:102-105`): calls
   `actions.handleCorrect()` **immediately** — synchronously, with no delay.

React runs child-hook effects before parent inline effects, so the order is:

- `useGameVoice` effect: `feedback === 'correct'` → starts 1300 ms timer (Timer A).
- GameView inline effect: `feedback === 'correct'` → calls `handleCorrect()` immediately
  → `processAction({type:'CORRECT'})` → **card advances**, `feedback` reset to `'none'`.
- GameView re-renders → `useGameVoice` effect fires for the new card →
  `feedback === 'none'` → `speakCurrentWord()` (TTS starts for the new card).
- At T=1300 ms, **Timer A fires** → `handleCorrect()` called **again** → card advances
  a *second* time while the new card's TTS is still playing → `synth.cancel()`
  produces `error: canceled` → `spoke.ok = false` → error message shown.
- STT of the new card is aborted before it can capture anything.

## Fix (single change)

**File:** `components/GameView.tsx`, lines 102–105.

Wrap the immediate `actions.handleCorrect()` call in a `!isVoiceActive` guard so that in
voice mode only `useGameVoice`'s 1300 ms timer advances the card.

```typescript
// BEFORE (line 102-105):
if (feedback === 'correct') {
  const thresholdPercent = Math.round(list.settings.threshold * 100);
  showToast(`Correct! ${lastAttempt} → ${expectedAnswer} (100% similarity, needed ${thresholdPercent}%)`, 'success');
  actions.handleCorrect();
}

// AFTER:
if (feedback === 'correct') {
  const thresholdPercent = Math.round(list.settings.threshold * 100);
  showToast(`Correct! ${lastAttempt} → ${expectedAnswer} (100% similarity, needed ${thresholdPercent}%)`, 'success');
  if (!isVoiceActive) {
    actions.handleCorrect();
  }
}
```

`isVoiceActive` is already in scope at line 40:
```typescript
const [isVoiceActive, setIsVoiceActive] = useState(() => voiceMode || list.settings.voiceEnabled === true);
```

### Corrected flow (after fix)

1. User speaks correct answer → `feedback = 'correct'`.
2. `useGameVoice` effect → starts 1300 ms timer (Timer A).
3. GameView effect → shows toast, **does not** call `handleCorrect()`.
4. T=1300 ms: Timer A fires → `handleCorrect()` → card advances → `feedback = 'none'`.
5. `useGameVoice` effect fires for the new card → `speakCurrentWord()` →
   TTS speaks the new word, STT starts listening.
6. User can now answer the new card. ✓

## Why this fix is sufficient (no other changes needed)

| Side effect | Status |
|---|---|
| Toast still shows | ✅ GameView effect still calls `showToast()` unconditionally |
| Feedback display (✓/✗) | ✅ Card stays until the 1300 ms timer fires, so `voicePhase==='feedback'` renders properly |
| TTS failure | ✅ No longer triggered — the premature second `handleCorrect()` that cancelled the ongoing TTS is eliminated |
| STT not starting | ✅ No longer triggered — STT starts cleanly after TTS completes |
| Non-voice mode | ✅ Unchanged — `isVoiceActive` is `false`, so `handleCorrect()` is still called immediately |

## Optional: Remove duplicate activity events

`submitVoice` (`useGameLogic.ts:153-159`) calls `emitAnswerEvents` for the `card_answered`
event. When `handleCorrect` fires later (from the 1300 ms timer), it calls
`emitAnswerEvents` **again** for the same card, producing a duplicate `card_answered`
event. This is pre-existing in the non-voice flow too (GameView's effect + `checkAnswer`).

**Out of scope for this fix** — requires refactoring how activity events are emitted
(e.g., only emit `card_answered` in `submitVoice`/`checkAnswer`, and `handleCorrect`
should only emit `card_level_up`/`game_advance`). Marked as a future cleanup item.

## Validation

1. `npx tsc --noEmit` — typecheck passes (no signature changes).
2. `npm run test` — existing tests pass (no test file exists for GameView; the change
   is a 3-line guard).
3. Manual test (Chrome desktop, voice mode ON):
   - Start a study session with voice.
   - Speak a correct answer.
   - **Expect:** ✓ feedback shown for ~1300 ms, then card advances, new word spoken, STT
     starts, no error message.
   - **Before fix:** card jumps immediately, TTS error message appears, next card
     auto-advances.
4. Manual test (voice mode OFF):
   - Type an answer and press Enter.
   - **Expect:** same behavior as before (immediate advance).

## Files to modify

- `components/GameView.tsx` (lines 102–105) — add `!isVoiceActive` guard.

## Risks

- **Low:** If `isVoiceActive` changes mid-session (user toggles voice off), GameView's
  effect would resume calling `handleCorrect()` immediately. `useGameVoice` would also
  stop (its `enabled` effect runs cleanup). No conflict since voice is off.
- **Low:** If the game finishes on the correct answer, the 1300 ms timer fires
  `handleCorrect()` on a finished game. `processAction` guards with
  `if (this.state.isFinished) return this` (engine line 275), so it's a safe no-op.
