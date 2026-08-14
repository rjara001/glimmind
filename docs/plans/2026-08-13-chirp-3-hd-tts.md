# Chirp 3 HD TTS Migration — Plan

**Date:** 2026-08-13
**Status:** Draft
**Scope:** TTS only (STT remains browser-native)

## Goal

Replace the browser-native Web Speech TTS backend with **Google Cloud Text-to-Speech (Chirp 3 HD)** while keeping the existing frontend API stable, adding a provider fallback, and enforcing character quotas.

## Constraints

- **TTS only.** Speech Recognition (STT) stays on `window.SpeechRecognition` / `webkitSpeechRecognition` (browser-native, no cloud).
- **Quotas must be enforced server-side** to prevent abuse and control costs.
- **Límites acordados:**
  - Global: **500.000 caracteres** por mes (reset mensual).
  - Por usuario: **5.000 caracteres** por mes (reset mensual).
- **Fallback obligatorio:** si Chirp 3 HD falla o se alcanza el límite, caer a Web Speech API sin romper el flujo.
- No exponer credenciales de Google Cloud en el frontend.
- Mantener el patrón de `callFunction.ts` para llamadas a Cloud Functions.

## Current State

- **TTS actual:** `hooks/useSpeechSynthesis.ts` usa `window.speechSynthesis` + `SpeechSynthesisUtterance`.
- **Voces:** `services/voice/voicePicker.ts` resuelve `SpeechSynthesisVoice` por idioma.
- **Settings:** `AssociationList.settings` guarda `voiceTermId` / `voiceDefId` (hoy `voiceURI` de Web Speech).
- **Infraestructura:** Firebase Functions v2 (Node 20) + `callFunction.ts` + `GEMINI_API_KEY` como secret. Patrón de quotas por usuario y global ya existe en `functions/src/services/aiService.js`.
- **Componentes consumidores:** `useGameVoice.ts`, `useVoiceSession.ts`, `GameView.tsx`.

## Decisions

1. **Proxy Cloud Function:** nueva función `synthesizeSpeech` en `functions/index.js`. Recibe `{text, voiceId, rate, pitch}` y devuelve `{audioContent (base64)}`. Usa **Application Default Credentials** (metadata server) sin API key.
2. **Quotas server-side:** documento `usage/chirpTts` en Firestore (global + por usuario/mes). Se incrementa en cada llamada exitosa a la función. Se valida antes de llamar a Google Cloud.
3. **Provider selector en Settings:** agregar `ttsProvider: 'browser' | 'chirp'` en `AssociationListSettings`. Default: `'browser'`.
4. **Lista curada de voces Chirp:** nuevo archivo `services/voice/chirpVoices.ts` con mapeo por idioma. En Settings se muestra un `<select>` con nombre legible + voice ID.
5. **Hook nuevo + modificación mínima:** crear `services/voice/chirpTts.ts` (servicio) y `hooks/useChirpTTS.ts` (frontend). `useSpeechSynthesis` delega al proveedor activo; si Chirp falla, cae a browser automáticamente.
6. **Costo estimado:** Chirp 3 HD ~$16 / 1M caracteres. Con 500K global/mes, costo mensual ≈ $8. Dentro de tier gratuito/alto de Google Cloud si se activa billing con cupo.

## Architecture

```
Frontend
  └── useSpeechSynthesis.ts (modificado)
        ├── provider === 'browser' → window.speechSynthesis (actual)
        └── provider === 'chirp'   → useChirpTTS.ts
                                      └── callFunction('synthesizeSpeech', { text, voiceId, ... })
                                            └── functions/index.js :: synthesizeSpeech
                                                  ├── validar quota global (500K/mes)
                                                  ├── validar quota usuario (5K/mes)
                                                  ├── registrar uso en Firestore (usage/chirpTts)
                                                  └── Google Cloud TTS API (Chirp 3 HD)
                                                        devuelve audioContent (base64)
                                                  ⚠ fallback: si falla o quota agotada → res.status + error
```

## Quota Model

**Firestore docs (server-side source of truth):**

```
usage/chirpTts/global/{YYYY-MM}
  { charsUsed: number, resetAt: timestamp }

usage/chirpTts/user/{uid}/{YYYY-MM}
  { charsUsed: number, resetAt: timestamp }
```

**Validación en Cloud Function `synthesizeSpeech`:**

1. Leer doc global del mes actual. Si no existe o `resetAt` < ahora → crear nuevo con `charsUsed: 0`.
2. Si `charsUsed >= 500_000` → reject `429` con mensaje claro.
3. Leer doc usuario del mes actual. Misma lógica de reset.
4. Si `charsUsed >= 5_000` → reject `429` con mensaje claro.
5. Llamar a Google Cloud TTS con el texto completo.
6. Incrementar `charsUsed` en ambos docs (transacción batched write).
7. Retornar `audioContent` base64 + metadata.

**Frontend behavior:**

- `useChirpTTS` detecta `429` / error de función y **automáticamente** usa browser TTS para ese utterance.
- En Settings, mostrar 3 estados por provider:
  - `browser`: "Gratis, voces del sistema"
  - `chirp`: "Chirp 3 HD · X / 5.000 chars este mes" (si quota < 80%)
  - `chirp (agotado)`: "Límite mensual alcanzado · Y / 500.000 chars globales"

## Services

| Service | Role | Needed | Notes |
|---|---|---|---|
| `window.speechSynthesis` | TTS fallback | Yes | Browser nativo, sin costo. |
| `functions.synthesizeSpeech` | Proxy Chirp 3 HD | Yes | Usa ADC/IAM (metadata server). Node 20. |
| `callFunction` | Cliente de CF | Yes | Ya existe en `services/callFunction.ts`. |
| Firestore `usage/chirpTts` | Quota tracking | Yes | Server-side source of truth. |

## Files

**New (frontend):**

- `services/voice/chirpVoices.ts` — catálogo curado de voces Chirp 3 HD por idioma.
- `services/voice/chirpTts.ts` — servicio para sintetizar audio vía Cloud Function.
- `hooks/useChirpTTS.ts` — hook React: `speak(text, voiceId)` → `Promise<SpeakResult>`.

**Modified:**

- `hooks/useSpeechSynthesis.ts` — agregar modo proveedor; delegar a `useChirpTTS` cuando `provider === 'chirp'`. Mantener API existente (`speak`, `cancel`, `voices`, `isSpeaking`).
- `types.ts` — agregar `VoiceProvider = 'browser' | 'chirp'`, `ttsProvider?: VoiceProvider` en `AssociationListSettings`, `ChirpVoice` interface.
- `services/settingsService.ts` — mapear nuevos campos en get/update settings.
- `services/voice/voicePicker.ts` — mantener compatibilidad; `resolveVoiceForLang` solo se usa en modo browser.
- `components/voice/SettingsModal.tsx` — selector de provider + lista de voces Chirp.
- `docs/voice-mechanism.md` — documentar nuevo flujo híbrido.

**New (backend):**

- `functions/src/services/chirpTtsService.js` — lógica de TTS + quota check.
- `functions/index.js` — agregar `synthesizeSpeech` (CORS, auth, timeout 60s, memoria 256MiB).
- `functions/src/utils/constants.js` — `CHIRP_TTS_GLOBAL_LIMIT = 500000`, `CHIRP_TTS_USER_LIMIT = 5000`.

## Technical Flow

### Happy path (Chirp)

1. `useSpeechSynthesis.speak()` detecta `provider === 'chirp'`.
2. Llama `useChirpTTS.speak(text, voiceId, rate, pitch)`.
3. `chirpTtsService` hace `callFunction('synthesizeSpeech', payload)`.
4. Cloud Function valida quotas, registra uso, llama a Google Cloud TTS.
5. Frontend recibe `audioContent` base64 → crea `Audio` object → reproduce.
6. Hook resuelve `SpeakResult` cuando `Audio.onended` o falla.

### Fallback path (browser)

- Si Cloud Function devuelve `429` (quota agotada) o `5xx` (error Google), `useChirpTTS` lanza un flag interno.
- `useSpeechSynthesis` captura el error y **re-ejecuta** con `provider === 'browser'` para ese mismo utterance.
- No se notifica al usuario en cada fallo; solo se muestra en Settings el estado actualizado.

### Voice selection flow

- Settings → `ttsProvider === 'browser'` → `voicePicker.ts` (actual).
- Settings → `ttsProvider === 'chirp'` → `<select>` con opciones de `chirpVoices.ts` por idioma.
- Guardado en `list.settings.voiceTermId` / `voiceDefId` como Chirp voice ID (ej: `"es-ES-Chirp-3-HD-A"`).

## Implementation Order

1. **Backend constants + `chirpTtsService.js` + `synthesizeSpeech` en `index.js`**
   - Validación de quotas, transacción Firestore, llamada a Google Cloud TTS.
2. **Frontend service + hook (`chirpTts.ts` + `useChirpTTS.ts`)**
   - Integración con `callFunction`, manejo de base64 → Audio, watchdog/retry.
3. **Modificar `useSpeechSynthesis.ts`**
   - Router por provider, fallback automático a browser.
4. **Types + Settings + `chirpVoices.ts`**
   - Catálogo curado, selector en modal, persistencia en settings.
5. **Validación**
   - `npx tsc --noEmit`, `npm run test`, `npm run build`.

## Validation

- `npx tsc --noEmit` (typecheck), `npm run test` (Vitest), `npm run build` (Vite build).
- Local dev via Firebase emulators (`firebase emulators:start --only functions`).
- Probar manualmente: exceder quota usuario, exceder quota global, fallback automático.
- No nuevos env vars de frontend; backend usa ADC/IAM.

## GCP Setup Done

- Text-to-Speech API: `texttospeech.googleapis.com` ENABLED en proyecto `fladycard-22a3e`.
- Autenticación: **ADC / Service Account**, sin `GOOGLE_CLOUD_TTS_API_KEY`.
- Service Account de Cloud Functions existente para `updateProgress` y `synthesizeSpeech`: `37487443736-compute@developer.gserviceaccount.com` (rol `roles/editor`).
- Rol específico `roles/cloudtexttospeech.user` no aplicable a este proyecto/recurso por restricción de IAM. Se procede con prueba real de ADC desde la función desplegada.
- Deploy de `synthesizeSpeech`: **Successful update operation** — `https://synthesizespeech-ogbc57laca-uc.a.run.app`
