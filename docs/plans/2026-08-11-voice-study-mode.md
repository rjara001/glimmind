# Voice Study Mode — Plan

**Date:** 2026-08-11
**Status:** Approved
**Scope:** MVP

## Goal

Add a fast, hands-free **voice study mode** to Glimmind. User selects a list, presses **PLAY**, the app speaks the target word (TTS), the user answers out loud (STT), the answer is evaluated, and the next card starts immediately. No chatbot, no AI conversation, minimal feedback.

## Constraints

- Do **not** modify the existing flashcard system (engine, `GameView`, game store, cloud sync).
- Reuse existing infrastructure: `GlimmindGame`, `utils/similarity.ts`, `callFunction.ts`, `list.settings`, Gemini quotas, `GEMINI_API_KEY` secret.
- Works in browser (Chrome desktop/Android primary; Safari iOS via typed fallback).
- API keys/credentials must never live in the frontend.

## Current State (Analysis)

- **Stack:** React 19 + TypeScript + Vite (PWA) + Zustand; Capacitor wrappers exist but the app is web-first.
- **Firebase:** Auth, Firestore, Hosting, Functions v2 (Node 20), emulators. 19 functions exist; only `aiGroup` uses Gemini (secret `GEMINI_API_KEY`, per-user 3/10 per day + global 200/day caps).
- **Data model:** `Association` (`term`/`definition`, cycles, stats); `AssociationList.settings` (`mode: training|real`, `flipOrder`, `threshold`, `ignoreArticles`, `showHints`).
- **Study flow:** Dashboard → `GameView` → `useGameLogic` wrapping the immutable `GlimmindGame` engine. Fuzzy answer validation already exists.
- **No speech code exists** (`speechSynthesis`/`SpeechRecognition` unused).

## Decisions

1. **STT on Safari iOS:** typed fallback inside the voice session (Web Speech API is unreliable on iOS). Full voice parity on iOS would require cloud STT (Deepgram/Google) — deferred.
2. **AI evaluation:** deferred. Local fuzzy matching decides. Ambiguous transcripts show a subtle pronunciation hint instead of calling Gemini (`aiVerifyAnswer` re-enabled later as a follow-up).
3. **Entry point:** a "Voice" (🎤) button next to "Study" per list on the Dashboard → new `view='voice'`.

## Architecture

```
Browser (VoiceGameView — new view)
  PLAY (user gesture → mic permission + speechSynthesis unlock)
  🔊 speak target word          ← window.speechSynthesis (TTS, free, no backend)
  🎤 capture answer             ← SpeechRecognition (STT, free on Chrome)
  Transcript ─► local fuzzy eval (utils/similarity + list.settings)
                   high match → correct | clear miss → incorrect
                   ambiguous  → subtle pronunciation hint (AI eval deferred)
  Result ✓/✗ (brief) → next card (TTS pre-queued)
```

## Services

| Service | Role | Needed | Notes |
|---|---|---|---|
| `speechSynthesis` | TTS | Yes (MVP) | Free, universal; reads single words. iOS unlock via user gesture. |
| `SpeechRecognition` | STT | Yes (MVP) | Chrome desktop/Android. iOS unstable → typed fallback. |
| `aiVerifyAnswer` (Cloud Function) | AI eval fallback | No (deferred) | Reuses `GEMINI_API_KEY` + quota pattern. Replaced by a subtle pronunciation hint for now. |
| Cloud STT (Deepgram/Google) | Full iOS parity | No (deferred) | Cost + latency; not needed for MVP. |

Avoid: new Firestore data, Hosting changes, paid TTS/STT, extra env vars.

## Technical Flow (PLAY → next card)

1. PLAY (user gesture): request mic permission, unlock `speechSynthesis` (empty utterance on iOS), preload voices (`voiceschanged`).
2. Card N: speak `term` (or `definition` if `flipOrder=reversed`) in its language; start `SpeechRecognition` (`continuous + interimResults`, lang = expected answer's language).
3. Evaluate: (a) interim result ≥ threshold → accept immediately; (b) else final transcript vs expected answer via `utils/similarity` + `ignoreArticles` + `threshold`. Ambiguous band (~55%–threshold) → mark incorrect with a subtle pronunciation hint ("No te escuché bien. Probá pronunciar más claro…"). No AI call in the MVP.
4. Result: correct → `✓` ~400ms → `processAction({CORRECT})`. Incorrect → `roof = tejado` ~900ms → `processAction({PASS})`. Progress persists through existing `onUpdateAssociations`/`syncToCloud`.
5. Next: TTS of card N+1 queued while showing result.

## Latency Mitigations

- Keep `SpeechRecognition` session alive (`continuous` + restart in `onend`; Chrome Android cuts every ~3–10s).
- Accept high-similarity interim results instead of waiting for final.
- Pre-queue next card's `speak()` during the result display.
- Ambiguous answers resolve instantly (no network round-trip): a subtle pronunciation hint is shown instead of an AI call.
- Preload voices on `voiceschanged` (avoids empty `getVoices()` on iOS).
- Request mic permission once, on PLAY.

## Files

**New (frontend):**

- `components/voice/VoiceGameView.tsx` — session orchestrator (parent controls progression/timeouts).
- `components/voice/VoiceCard.tsx` — display-only (word, mic status, interim/final transcript, result, typed fallback).
- `components/voice/VoiceFinished.tsx` — session summary.
- `hooks/useSpeechSynthesis.ts` — TTS wrapper (lang, iOS unlock, onEnd).
- `hooks/useSpeechRecognition.ts` — STT wrapper (continuous, restart-on-end, interim).
- `hooks/useVoiceSession.ts` — voice state machine over `GlimmindGame`.
- `services/voice/evaluateAnswer.ts` — local + AI evaluation.
- `services/voice/evaluateAnswer.test.ts` — tests.
- `services/voice/languages.ts` (+ test) — `list.concept` → BCP-47 mapping (TTS vs STT languages).

**Modified:**

- `App.tsx` — `view='voice'` + `handlePlayVoice(id)` (additive, ~15 lines).
- `components/Dashboard.tsx` — Voice button + `onPlayVoice` prop.
- `components/BigListCard.tsx` + `types/big-list-card-props.ts` — Voice button on big-list cards.
- ~~`functions/index.js` + `functions/src/services/aiService.js`~~ — deferred with the AI fallback (re-add `aiVerifyAnswer` + `callGeminiRaw` later).

## Implementation Order

1. `services/voice/languages.ts` + `evaluateAnswer.ts` (+ tests)
2. `hooks/useSpeechSynthesis.ts`, `hooks/useSpeechRecognition.ts`
3. `hooks/useVoiceSession.ts`
4. `components/voice/VoiceCard.tsx`, `VoiceFinished.tsx`, `VoiceGameView.tsx`
5. `App.tsx` + `Dashboard.tsx` wiring
6. `functions/src/services/aiService.js` + `functions/index.js` (`aiVerifyAnswer`)
7. Validate: `npx tsc --noEmit`, `npm run test`, `npm run build`

## Validation

- `npx tsc --noEmit` (typecheck), `npm run test` (Vitest), `npm run build` (Vite build).
- Local dev via Firebase emulators (existing wiring in `firebase.ts` / `callFunction.ts`).
- No new env vars; `GEMINI_API_KEY` stays a functions secret.

## Open Items (Follow-up)

- Manual multi-card selection ("select 100 cards then PLAY") — currently plays the whole active list.
- Cloud STT for full voice parity on Safari iOS.
- Re-enable AI evaluation: `aiVerifyAnswer` (Gemini) for ambiguous transcripts, replacing the current pronunciation hint.
- Nicer TTS voices (e.g., Google Cloud TTS via function) — not needed for MVP.
