# Narration Language & Voice Flag Fix

**Date:** 2026-08-25
**Status:** Implemented
**Areas:** Voice TTS narration, list settings migration

## Problem

Three related inconsistencies were found in how the voice mode speaks system phrases and renders language flags:

### 1. System feedback phrases hardcoded in Spanish, spoken with the term language voice

All game meta-phrases were hardcoded in Spanish in `src/services/voice/spokenPhrases.ts`, but they were spoken using `narrationLang` — which resolves to the **term-side language** (`voiceTermLang` / first concept label, see `useGameVoice.ts`). For a list like `Inglés / Español`, a Spanish phrase such as `"fallaste"` was spoken with an **English voice/accent**.

Inventory of affected phrases:

| Trigger | Spanish phrase |
|---|---|
| Pass command ack | `"Pues vamos con la siguiente"` |
| Stop command ack | `"Deteniendo el juego"` |
| Reveal command ack | `"Esperaba que dijieras: {answer}"` |
| Correct feedback | `"muy bien, sigue asi"` |
| Incorrect tier 1 (> threshold − 5%) | `"muy cerca pero no"` |
| Incorrect tier 2 (> threshold − 20%) | `"cerca"` |
| Incorrect tier 3 (> threshold − 45%) | `"te fallo un poco"` |
| Incorrect fail | `"fallaste"` |

### 2. Reveal acknowledgement mixed two languages in one utterance

The reveal ack concatenated a Spanish prefix with the expected answer (`"Esperaba que dijieras: to run"`) into a single utterance spoken with the narration voice, so foreign-language answers were pronounced with the wrong accent.

### 3. Globe emoji 🌐 instead of language flags during gameplay

`getLanguageFlag()` (`src/services/voice/languageFlags.ts`) returns 🌐 when the language is missing or unknown. Lists created via `DEFAULT_LIST_SETTINGS` did not define `voiceTermLang`/`voiceDefLang`, so every freshly created list (and any legacy list stored before those fields existed) rendered 🌐 instead of flags.

## Decisions

- Narration phrases are **translated** (not just re-voiced) to all six supported picker languages (`es | en | fr | de | it | pt`) and spoken in the **value1 (term-side) language**, matching the existing `narrationLang` behavior.
- The reveal acknowledgement is split into **two utterances**: translated prefix with the narration voice + expected answer with its own side's language and voice.
- No manual "narration voice" picker; the narration uses the term-side language (auto-resolved voice / existing `voiceTermId`).
- Globe fix scope: defaults at creation **plus** lazy migration when lists are loaded.

## Solution

### Files changed

| File | Change |
|---|---|
| `src/types.ts` | Widened `voiceTermLang`/`voiceDefLang` from `VoiceLanguage` union to `string` |
| `src/services/voice/languages.ts` | Added `normalizeVoiceLanguageSettings()` |
| `src/services/voice/spokenPhrases.ts` | Rewritten: multilingual phrase tables + `getRevealAckPrefix()`, builders accept `lang` |
| `src/hooks/voice/useGameVoice.ts` | Two-utterance reveal; all builders receive `narrationLang`; deps fixes |
| `src/hooks/app/useAppActions.ts` | Normalizer applied at both list-creation sites |
| `src/store/gameStore.ts` | Internal `withNormalizedVoiceLanguages()` applied at every list hydration point |
| `tests/services/voice/spokenPhrases.test.ts` | Rewritten (16 tests) |
| `tests/services/voice/languages.test.ts` | Extended with normalizer suite (7 new tests, 22 total) |

### Multilingual phrase tables (`src/services/voice/spokenPhrases.ts`)

- Phrase constants became `Record<VoiceLanguage, string>` tables.
- Builders now accept an optional trailing `lang?: string | null` parameter with fallback to `'es'` for unknown/null languages:
  - `buildCommandAcknowledgement(command, lang)` — handles pass/stop only.
  - New `getRevealAckPrefix(lang)` — returns only the translated reveal prefix (the answer itself is emitted separately).
  - `buildCorrectFeedbackPhrase(...)` / `buildIncorrectFeedbackPhrase(...)` — same similarity-tier logic, translated output.

### Two-utterance reveal (`src/hooks/voice/useGameVoice.ts`)

`speakAnswer()` now:
1. Speaks `getRevealAckPrefix(narrationLang)` with the narration language and `voiceTermId`.
2. Speaks the hidden answer with `languages.sttLang` (the answer-side language) and the answer-side voice id (`voiceDefId`, or `voiceTermId` when flipped).

Feedback effects and stop/pass acknowledgements pass `narrationLang` to the builders. `queuePassAcknowledgement` dependency array was fixed (was empty while capturing state).

### Settings normalization + lazy migration

New pure helper in `src/services/voice/languages.ts`:

```ts
normalizeVoiceLanguageSettings(concept, settings)
```

- Keeps existing values untouched when both languages are present (returns the same object reference).
- Fills missing sides from `detectLanguage()` on the concept labels, mirroring `resolveVoiceLanguages`' two-tier fallback (an unrecognised side inherits the recognised one), final fallback `'es'`.

Applied at every point where lists enter the store (`src/store/gameStore.ts`):
- A single internal helper `withNormalizedVoiceLanguages()` wraps `setLists`, localStorage hydration, cloud merge results, backup restores, and `syncFromCloud`.
- List creation applies it on top of `DEFAULT_LIST_SETTINGS` in `src/hooks/app/useAppActions.ts` (`createListCore` and list splitting).

Migration is lazy/in-memory: no Firestore write is forced, but normalized settings get persisted through the existing localStorage persistence paths.

### Type widening (`src/types.ts`)

`voiceTermLang` / `voiceDefLang` changed from the narrow `VoiceLanguage` union to `string`: detection can produce codes outside the picker union (`'ja'`, `'zh-CN'`, `'pt-BR'`, ...) that must round-trip without data loss. All consumers already treated these fields as plain strings.

### Translation reference

Full phrase tables now shipped in `spokenPhrases.ts` (Spanish strings kept byte-identical to the previous behavior):

| Phrase | es | en | fr | de | it | pt |
|---|---|---|---|---|---|---|
| Pass ack | Pues vamos con la siguiente | Let's move on to the next one | Passons au suivant | Gehen wir zur nächsten | Passiamo al prossimo | Vamos para o próximo |
| Stop ack | Deteniendo el juego | Stopping the game | Arrêt du jeu | Spiel wird gestoppt | Fermo il gioco | Parando o jogo |
| Reveal prefix | Esperaba que dijieras: | I was expecting you to say: | Je m'attendais à ce que tu dises : | Ich hatte gehofft, dass du sagst: | Mi aspettavo che dicessi: | Eu esperava que você dissesse: |
| Correct | muy bien, sigue asi | very good, keep it up | très bien, continue comme ça | sehr gut, mach weiter so | molto bene, continua così | muito bem, continue assim |
| Incorrect: very close | muy cerca pero no | so close, but not quite | tout près, mais non | ganz nah dran, aber nein | quasi, ma no | quase, mas não |
| Incorrect: close | cerca | close | près | nah dran | vicino | perto |
| Incorrect: somewhat | te fallo un poco | a little off | un peu à côté | ein bisschen daneben | un po' fuori | um pouco fora |
| Incorrect: fail | fallaste | you failed | raté | leider falsch | hai sbagliato | você errou |

Unknown/null language codes always fall back to Spanish.

## Behavior before / after

Scenario: list with concept `Inglés / Español`, voice enabled.

| Event | Before | After |
|---|---|---|
| Answer fails far from threshold | English voice reads `"fallaste"` | English voice reads `"you failed"` |
| Reveal command | Single utterance `"Esperaba que dijieras: to run"` in English voice | `"I was expecting you to say:"` (English voice) + `"to run"` (definition voice) |
| Card labels during play | 🌐 on both sides if settings never saved | 🇬🇧 / 🇪🇸 flags derived from the concept, no user action needed |
| List created fresh | No voice languages stored → 🌐 | Settings stored at creation time |

## Out of scope

- `getDefaultChirpVoiceId()` still returns `undefined` → Chirp falls back to browser TTS unless an explicit Chirp voice id is configured per side.
- Settings preview test phrases (`playTestVoice` in `SettingsModal.tsx`) remain as-is (settings-only, not gameplay).
- `useVoiceSession.ts` speaks no meta phrases; untouched.
- No i18n framework introduced; plain tables suffice for the six supported languages.

## Verification

- `tests/services/voice/spokenPhrases.test.ts` rewritten (16 tests): translations for all tiers/languages, Spanish fallbacks for unknown/null codes, null cases.
- `tests/services/voice/languages.test.ts` extended with the normalizer suite (7 new tests, 22 total): recognized concepts, opaque concepts, partially recognized, partial overrides, identity preservation when both languages exist.
- Targeted suites: `tests/services/voice` + `tests/store` → 96/96 passed.
- Full suite: 424 passed; the only failures (SettingsModal ×5, grouping ×2) reproduce on a clean checkout via `git stash` — pre-existing, unrelated.
- `tsc --noEmit`: error count went from 152 (baseline) to 150; none of the remaining errors touch modified files.
