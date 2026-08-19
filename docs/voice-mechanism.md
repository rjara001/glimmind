# Voice Mechanism (Text-to-Speech & Speech-to-Text)

## Overview

Glimmind implements two voice mechanisms backed by the browser-native Web Speech API:

| Mechanism | Entry Point | Description |
|---|---|---|
| **Voice Study Mode** (dedicated session) | `components/voice/VoiceGameView.tsx` + `hooks/useVoiceSession.ts` | A standalone, hands-free session: TTS reads the target word, STT captures the spoken answer, the answer is evaluated locally, and the next card starts automatically. |
| **Game Voice** (integrated in flashcards) | `hooks/useGameVoice.ts` (consumed by `components/GameView.tsx` + `GameCard.tsx`) | An enhancement to the classic study flow: the user can speak to answer or issue voice commands. |

Both share the same underlying primitives:

- **TTS (text → speech):** `window.speechSynthesis` (free, universal).
- **STT (speech → text):** `window.SpeechRecognition` / `webkitSpeechRecognition` (Chrome desktop/Android). On Safari iOS a typed fallback is shown.

---

## Architecture (layered)

```
Browser APIs
├── speechSynthesis      (TTS)
└── SpeechRecognition    (STT)

React Hooks (abstraction layer)
├── useSpeechSynthesis      → TTS: speak(), cancel(), unlock(), voices[]
├── useSpeechRecognition     → STT: start(), stop(), abort(), interimTranscript
├── useVoiceSession          → state machine for Voice Study Mode
└── useGameVoice             → state machine for integrated Game Voice

Services (business logic)
├── services/voice/languages.ts      → concept → BCP-47 language code (TTS / STT)
├── services/voice/evaluateAnswer.ts → fuzzy matching of spoken answers
├── services/voice/commands.ts       → matching of voice commands
├── services/voice/voicePicker.ts    → selects a synthesized voice by language
└── services/voice/languageFlags.ts  → emoji flag per language

Components
├── components/voice/VoiceGameView.tsx  → orchestrator (parent — controls timeouts / progression)
├── components/voice/VoiceCard.tsx      → display-only (renders state, fires callbacks)
└── components/voice/VoiceFinished.tsx  → session summary screen
```

### Child / parent responsibility split (per AGENTS.md)

- **Child components (`VoiceCard`, `GameCard`) are display-only.** They never advance the game automatically.
- **The parent (`VoiceGameView`, `GameView`) owns progression, timeouts, and card cycles.**
- All timeouts that advance cards live in the parent, never in children.

---

## Types

Defined in `types.ts` (lines 6–8 and 40–43):

```typescript
export type VoiceLanguage = 'es' | 'en' | 'fr' | 'de' | 'it' | 'pt';
export type VoiceCommandId = 'reveal' | 'pass' | 'continue' | 'stop';
export type VoiceCommandsConfig = Record<VoiceCommandId, string[]>;

// Inside AssociationListSettings:
interface AssociationListSettings {
  voiceEnabled?: boolean;
  voiceTermLang?: VoiceLanguage;   // language of the term (TTS)
  voiceDefLang?: VoiceLanguage;    // language of the definition (STT)
  voiceCommands?: VoiceCommandsConfig;
}
```

### Voice phases (Voice Study Mode)

From `hooks/useVoiceSession.ts` (line 16):

```typescript
export type VoicePhase = 'idle' | 'speaking' | 'listening_for_answer' | 'evaluating' | 'finished';
```

### Voice phases (integrated Game Voice)

From `hooks/useGameVoice.ts` (line 8):

```typescript
export type GameVoicePhase = 'idle' | 'speaking' | 'listening' | 'evaluating' | 'feedback';
```

### Session counts

From `hooks/useVoiceSession.ts` (lines 10–14):

```typescript
export interface VoiceSessionCounts {
  total: number;
  correct: number;
  incorrect: number;
}
```

---

## Language Resolution

**File:** `services/voice/languages.ts`

### `detectLanguage(label: string): string | null`

Normalizes the label (lowercase, accents stripped, non-alphanumeric removed) and looks it up in `LANGUAGE_MAP` (40+ entries: `es`, `en`, `fr`, `de`, `it`, `pt-BR`, `ja`, `ko`, `zh-CN`, `ru`, `ar`, `nl`, `sv`, `pl`, `tr`, `el`, `hi`, `uk`, `vi`, `th`).

### `resolveVoiceLanguages(concept, flipOrder, overrides): VoiceLanguages`

- **Input:** `concept` (e.g. `"Inglés / Español"`), `flipOrder` (`'normal' | 'reversed'`), optional `overrides` (`termLang`, `defLang`).
- **Output:** `{ ttsLang, sttLang }`.
- **Two-tier fallback:**
  1. If one side of the concept is unrecognised (e.g. `"Valor 1 / Español"`), it adopts the recognised side's language.
  2. If **neither** side resolves (e.g. `"Test1 / Test1"`), it falls back to `DEFAULT_VOICE_LANGUAGE = 'es'` so the pipeline never receives `null`.

| Concept | flipOrder | Result |
|---|---|---|
| `"Inglés / Español"` | `normal` | ttsLang=`'en'`, sttLang=`'es'` |
| `"Inglés / Español"` | `reversed` | ttsLang=`'es'`, sttLang=`'en'` |
| `"Valor 1 / Español"` | `normal` | ttsLang=`'es'`, sttLang=`'es'` |
| `"Test1 / Test1"` | `normal` | ttsLang=`'es'`, sttLang=`'es'` (default fallback) |

### `resolveLanguages(concept, flipOrder)`

Thin wrapper that calls `resolveVoiceLanguages` with no overrides. Used by `useVoiceSession` and `useGameVoice`.

---

## Answer Evaluation (STT → text)

**File:** `services/voice/evaluateAnswer.ts`

### `evaluateAnswer(input, expected, options): AnswerEvaluation`

#### Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `input` | `string` | — | STT transcript (what the user spoke) |
| `expected` | `string` | — | The correct answer |
| `options.ignoreArticles` | `boolean` | `false` | Ignore articles (`el`, `la`, `the`, etc.) |
| `options.threshold` | `number` | `0.95` | Minimum similarity for a correct match |

#### Result shape

```typescript
interface AnswerEvaluation {
  correct: boolean;
  method: 'exact' | 'fuzzy' | 'ambiguous';
  similarity: number | null;   // 0.0 – 1.0
  suggestion?: string;          // only when method === 'ambiguous'
}
```

#### Algorithm

```
1. Normalize input   (lowercase, accents stripped, punctuation removed)
2. Normalize expected
3. If input is empty       → INCORRECT (similarity = null)
4. If input === expected   → EXACT  (correct = true,  similarity = 1)
5. Compute Levenshtein similarity (utils/similarity.ts)
6. similarity >= threshold (0.95)  → FUZZY, correct
7. similarity >= threshold * 0.55  → AMBIGUOUS (incorrect + suggestion)
8. similarity <  ambiguous band     → FUZZY, incorrect (no suggestion)
```

#### Ambiguous suggestion text

> `"No te escuché bien. Probá pronunciar más claro o escribí la respuesta."`

#### Token normalization (`normalizeForComparison`)

- Uses `normalizeText()` (lowercase, trim, accents removed, whitespace collapsed).
- Strips punctuation: `.replace(/[^\w\s]/gi, '')`.
- When `ignoreArticles` is `true`, filters out tokens in the `IGNORED_WORDS` set (articles in Spanish and English).

#### Tests

`services/voice/evaluateAnswer.test.ts` — 8 tests covering exact matches (case/accent insensitive), punctuation stripping, article handling, fuzzy thresholds, clearly-different answers, empty input, and ambiguous responses.

---

## TTS — `useSpeechSynthesis`

**File:** `hooks/useSpeechSynthesis.ts`

### Public API

```typescript
interface SpeakResult {
  ok: boolean;
  voiceName: string | null;
  voicesCount: number;
}

function useSpeechSynthesis(): {
  supported: boolean;
  voices: SpeechSynthesisVoice[];
  isSpeaking: boolean;
  speak: (text: string, lang: string | null) => Promise<SpeakResult>;
  cancel: () => void;
  unlock: () => void;
}
```

### Internal mechanics

1. **Voice loading** — listens to the `voiceschanged` event and stores voices in state. `ensureVoices()` waits up to 2000 ms when Chrome loads voices asynchronously.
2. **unlock()** — calls `speechSynthesis.resume()`. It does **not** speak an empty utterance (a known Chrome queue-hanger). Must be called on a user gesture (PLAY).
3. **speak(text, lang)** — returns a Promise that resolves when synthesis ends. Includes:
   - **Watchdog** — if no `end`/`error` event fires within `max(3000, min(10000, len * 700 ms))`, cancels and resolves `ok: false`.
   - **Retry** — if the first attempt fails, retries once after 150 ms.
   - **Voice selection** — delegates to `resolveVoiceForLang()`.
   - **Deferral** — uses `setTimeout(50 ms)` before `synth.speak()` to avoid Chromium discarding the utterance after a synchronous `cancel()`.

### Instrumentation logs

- `[TTS] speak start lang=` — synthesis start
- `[TTS] end` — synthesis completed
- `[TTS] error` — synthesis error
- `[TTS] watchdog timeout, cancelling` — watchdog fired
- `[TTS] retry speak` / `[TTS] failed after retry` — retry attempts

---

## STT — `useSpeechRecognition`

**File:** `hooks/useSpeechRecognition.ts`

### Public API

```typescript
interface UseSpeechRecognitionOptions {
  onFinal: (transcript: string) => void;
  onError?: (message: string) => void;
  onTransientMessage?: (message: string) => void;
}

function useSpeechRecognition(options): {
  supported: boolean;
  isListening: boolean;
  interimTranscript: string;
  start: (lang: string | null) => void;
  stop: () => void;
  abort: () => void;
}
```

### Internal mechanics

1. **Fresh instance per start** — creates `new SpeechRecognition()` on every `start()` (reusing an instance after `abort()` makes Chrome go mute).
2. **Continuous mode** — `continuous = true`, `interimResults = true` (captures both live partials and final results).
3. **Auto-restart** — on `onend`, if `shouldRunRef` is true, retries `start()` after 150 ms (Chrome Android cuts every 3–10 s).
4. **Stable callback refs** — `onFinalRef`, `onErrorRef`, `onTransientRef` avoid stale closures.
5. **Cleanup** — on unmount, aborts the instance and clears all timers.

### Errors handled

| Error | Handling |
|---|---|
| `not-allowed` | Fatal: "Microphone permission denied." |
| `service-not-allowed` | Fatal: "Speech recognition service not allowed." |
| `audio-capture` | Fatal: "No microphone input detected." |
| `no-speech` | Transient: "No speech detected by browser recognition." |
| `aborted` | Ignored (normal cleanup) |
| `network` | Error: "Speech recognition network error." |
| other | Generic error with code |

---

## Voice Study Mode — `useVoiceSession`

**File:** `hooks/useVoiceSession.ts`

### State machine

```
[idle] → start() → [speaking] → TTS done → [listening_for_answer] → STT final → [evaluating] → result → [speaking] (next card)
                                                                                       → isFinished → [finished]
```

| Phase | What happens | UI shows |
|---|---|---|
| `idle` | Session stopped | — |
| `speaking` | TTS reading the word | "Hablando…" |
| `listening_for_answer` | STT listening for the answer | "Escuchando…" + live transcript |
| `evaluating` | Answer evaluation | "Evaluando…" |
| `finished` | Session complete | `VoiceFinished` summary |

### Public methods

| Method | Description |
|---|---|
| `start()` | Begins the session. Sets `shouldRunRef`, calls `playCurrentWord()`. |
| `stop()` | Stops everything (aborts STT, cancels TTS, clears timers). |
| `restart()` | Recreates `GlimmindGame`, resets counts, calls `start()`. |
| `repeat()` | Repeats the current word via TTS. |
| `submitTyped(text)` | Submits a typed answer (iOS fallback). |

### `playCurrentWord()` flow

1. Abort previous STT (`stt.abort()`).
2. Determine word: `flipOrder === 'reversed'` → definition; else → term.
3. Set phase to `speaking`; call `tts.speak(word, ttsLang)`.
4. If `shouldRunRef` still active, set phase to `listening_for_answer`.
5. Start STT: `stt.start(sttLang)`.

### `handleAnswer()` flow

1. Get the current association from `GlimmindGame`.
2. Call `game.setUserInput(answer).checkAnswer()` — uses the immutable engine for fuzzy evaluation.
3. Determine `correct` from `evaluated.state.feedback === 'correct'`.
4. If `activityHistoryEnabled`, record a `card_answered` event via `createActivityEvent()`.
5. Update counts: `{ total, correct, incorrect }`.
6. Process the action: `CORRECT` advances; `PASS` shows hint and repeats.
7. If `isFinished` → phase `finished`. Otherwise, wait `900 ms` then call `playCurrentWord()`.

### Sync guard (resolved bug)

`VoiceGameView.tsx` has a `useEffect` that syncs `gameState.associations` to `onUpdateAssociations`. To prevent infinite mount-time sync, it compares against a `lastSyncedRef` snapshot (JSON string) and skips no-op updates (verified via `[SYNC] guard check: same=true`).

### Cleanup (resolved bug)

The initial `useEffect(..., [stt, tts])` was re-entrant on every render because both hooks return a new object literal each render. This caused `tts.cancel()` to fire mid-utterance (`[TTS] error canceled`) and `stt.abort()` to destroy the recognition instance before `onstart` could fire (mic never activated).

**Fix:** stabilized cleanup deps to the `useCallback`-stable methods `[stt.abort, tts.cancel]`, so cleanup runs only on unmount.

---

## Integrated Game Voice — `useGameVoice`

**File:** `hooks/useGameVoice.ts`

This enhances the classic study flow rather than running a standalone session. It is consumed by `GameView.tsx` and `GameCard.tsx`.

### State machine

```
[idle] → enabled → [feedback='none'] → speakCurrentWord() → [speaking] → [listening]
[listening] → STT final → matchVoiceCommand() → continue / pass / reveal / stop
[listening] → STT final → no command → onSubmitVoice() → [evaluating] → [feedback]
[feedback=correct] → 1300 ms timer → onAdvance()
[feedback=incorrect] → 1300 ms timer → speakCurrentWord() (repeats)
```

### Voice commands

Defined in `services/voice/commands.ts`:

| Command | Default keywords | Behaviour |
|---|---|---|
| `reveal` | `revelar`, `mostrar`, `reveal`, `show` | Reveals the answer (only in `listening` phase and not yet revealed) |
| `pass` | `pasar`, `siguiente`, `next`, `pass` | Advances to the next card |
| `continue` | `continuar`, `adelante`, `continue` | In `feedback`: advances if correct, repeats if incorrect |
| `stop` | `stop`, `detener`, `parar`, `alto` | Stops the voice session |

### Command matching (`matchVoiceCommand`)

Normalizes the spoken text (lowercase, accents stripped) and checks:

1. **Exact match** against the normalized keyword.
2. **Word-boundary match:** text starts with the keyword and the following character is a word boundary (not alphanumeric). This prevents `"stopwatch"` from triggering `stop`.

### Per-list configuration

Commands are overridable per list via `list.settings.voiceCommands`. `resolveVoiceCommands()` merges overrides with defaults.

---

## Voice Selection — `voicePicker.ts`

### `resolveVoiceForLang(lang: string | null, voices: VoiceLike[]): VoiceLike | undefined`

Resolution order:

1. Exact language match (e.g. `es-ES` === `es-ES`).
2. Regional prefix match (e.g. `es` matches `es-ES`).
3. Base-language match (e.g. `es` === `es`).
4. System default voice.
5. First available voice.

If `lang` is `null`, falls back to the default voice or the first available.

**`VoiceLike` interface** (`{ lang, name, default, localService, voiceURI }`) is structurally compatible with `SpeechSynthesisVoice` but uses explicit types (no `any`).

---

## Language Flags — `languageFlags.ts`

### `getLanguageFlag(lang: string | null | undefined): string`

Returns the emoji flag for a language code (e.g. `es` → `🇪🇸`, `en` → `🇬🇧`, `pt-BR` → `🇧🇷`). Unknown or `null`/`undefined` returns `🌐`.

Used in `GameCard.tsx` next to the vocabulary label.

---

## UI Components

### `components/voice/VoiceGameView.tsx`

**Role:** orchestrator (parent). Owns the full session lifecycle.

- **Props:** `list: AssociationList`, `onBack: () => void`, `onUpdateAssociations: (updated: any[]) => Promise<void>`
- Instantiates `useVoiceSession(list)`.
- Syncs associations to the store via `useEffect` (with snapshot guard).
- Renders `VoiceFinished` when `session.isFinished`.
- Renders `VoiceCard` with all phase/transcript/error props.
- Passes `expectedAnswer` as the placeholder for the typed fallback input.

### `components/voice/VoiceCard.tsx`

**Role:** presentational (child). Renders state only; fires callbacks.

- **Props:** `displayWord`, `expectedAnswer`, `phase`, `transcript`, `interim`, `error`, `isListening`, `onRepeat`, `onStop`, `onSubmitTyped`
- **UI:**
  - Large display word.
  - Phase indicators: "Hablando…", "Escuchando…", "Evaluando…".
  - Spoken text: `"Tu respuesta"` with live transcript.
  - Error banner (amber) when present.
  - Buttons: "Repetir palabra", "Detener sesión", "Escribir respuesta".
  - Typed fallback form (toggle, with autofocus input + submit) — for iOS.

### `components/voice/VoiceFinished.tsx`

**Role:** session summary screen.

- **Props:** `listName`, `counts: VoiceSessionCounts`, `onRestart`, `onBack`
- Displays: correct count, incorrect count, total cards, accuracy percentage.
- Buttons: "Repetir Sesión", "Regresar al Panel".

---

## App-wide Integration

### Voice Study Mode entry point

Per the original plan (`docs/plans/2026-08-11-voice-study-mode.md`), a "Voice" (🎤) button appears next to "Study" on the Dashboard per list → `view='voice'`. `App.tsx` handles `handlePlayVoice(id)` which mounts `VoiceGameView`.

### Integrated Game Voice

- `useGameVoice` is consumed in `GameView.tsx` (line 82).
- Passed to `GameCard.tsx` via props: `voiceMode`, `voicePhase`, `voiceTranscript`, `voiceInterim`, `voiceError`, `voiceEnabled`, `voiceTermLang`, `voiceDefLang`.
- `GameCard` shows a "Responder por voz" button (`onSpeakAnswer`) that triggers TTS of the definition.
- The voice toggle lives in `GameHeader.tsx` as `onVoiceToggle`.

---

## Per-list Configuration (SettingsModal)

`components/game/SettingsModal.tsx` exposes:

| Setting | Type | Description |
|---|---|---|
| `voiceEnabled` | `boolean` | Enable/disable voice |
| `voiceTermLang` | `VoiceLanguage` | TTS language for the term |
| `voiceDefLang` | `VoiceLanguage` | STT language for the definition |
| `voiceCommands` | `VoiceCommandsConfig` | Custom keyword triggers per command |

Language options: `es`, `en`, `fr`, `de`, `it`, `pt`.

---

## Cloud Sync

In `store/gameStore.ts` (lines 184–187), voice settings are merged with cloud precedence:

```typescript
voiceEnabled: cloud.voiceEnabled ?? local.voiceEnabled,
voiceTermLang: cloud.voiceTermLang ?? local.voiceTermLang,
voiceDefLang: cloud.voiceDefLang ?? local.voiceDefLang,
voiceCommands: cloud.voiceCommands ?? local.voiceCommands,
```

---

## Diagnostics & Resolved Bugs

Source: `docs/issues/2026-08-11-voice-study-mode-diagnostics.md`

### Resolved bugs

| Bug | Root cause | Fix |
|---|---|---|
| Mount-time infinite sync | `onUpdateAssociations` fired on every render without guard | JSON snapshot comparison via `lastSyncedRef` |
| STT "reused instance" | Reusing `SpeechRecognition` after `abort()` makes Chrome mute | Fresh instance per `start()` |
| TTS `error canceled` + mic never activates | `useEffect(..., [stt, tts])` cleanup re-ran every render (new object literals) | Stabilized cleanup deps to `useCallback`-stable `[stt.abort, tts.cancel]` |
| `unlock()` hangs Chrome queue | `speak(new SpeechSynthesisUtterance(''))` | Only calls `speechSynthesis.resume()` |
| `null` languages for opaque concepts | `detectLanguage` returned `null` | Two-tier fallback in `resolveVoiceLanguages` |

### Pre-existing store bug (do NOT touch — user decision)

`store/gameStore.ts:683-691`: `syncToCloud` calls `listService.updateList(...)` when the cloud list is missing, but `updateList` requires the list to exist → `404 {"error":"List not found"}`. It should call `createList`. This pre-exists and also affects normal Study mode (`GameView.tsx:74`). Not the cause of the mic issue.

---

## Tests

| File | Tests | Coverage |
|---|---|---|
| `services/voice/evaluateAnswer.test.ts` | 8 | Exact match, fuzzy, articles, empty, ambiguous |
| `services/voice/languages.test.ts` | 10 | detectLanguage, resolveLanguages, overrides, fallbacks |
| `services/voice/voicePicker.test.ts` | 7 | Exact match, base lang, default, case-insensitive |
| `services/voice/commands.test.ts` | 4 | normalizeCommandText, resolveVoiceCommands, matchVoiceCommand |
| `services/voice/languageFlags.test.ts` | 3 | Supported langs, unknown, null/undefined |

### Validation commands

```bash
npx tsc --noEmit    # typecheck
npm run test        # Vitest
npm run build       # Vite build
```

---

## End-to-End Flow (Voice Study Mode)

```
User presses PLAY
  → useVoiceSession.start()
    → playCurrentWord()
      → stt.abort()           (clear previous STT)
      → tts.speak(word)       (TTS reads, with watchdog + retry)
        → phase: listening_for_answer
          → stt.start(lang)   (mic active)
            → onFinal(transcript)
              → handleAnswer(transcript)
                → game.setUserInput + checkAnswer  (Levenshtein fuzzy matching)
                  → correct? → processAction(CORRECT)
                  → wrong?   → processAction(PASS)
                    → wait 900 ms
                      → playCurrentWord() (next card)
                          ↓
                    isFinished? → phase: finished → VoiceFinished
```

---

## Limitations & Constraints

| Constraint | Detail |
|---|---|
| Safari iOS STT | Web Speech API unreliable; uses typed fallback. Cloud STT (Deepgram/Google) deferred. |
| Primary browser | Chrome desktop/Android. |
| AI evaluation | Deferred — uses local fuzzy matching. Pronunciation hint is the fallback for ambiguous answers. |
| No new dependencies | TTS/STT are browser-native (free). |
| API keys | `GEMINI_API_KEY` is a Cloud Functions secret, never in the frontend. |
| No new Firestore collections | Data persists through the existing `GlimmindGame` engine. |
