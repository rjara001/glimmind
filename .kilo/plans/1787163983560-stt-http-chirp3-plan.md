# Plan: Reemplazar useChipTTSTT por HTTP batch con Chirp 3

## Objetivo
Eliminar el WebSocket relay y volver a una arquitectura estricta Frontend + Firebase Functions HTTP. El hook `useChipTTSTT` graba audio localmente y envía el blob a una Cloud Function HTTP que transcribe con Google Chirp 3.

## Alcance
- Backend: 1 Cloud Function HTTP nueva + limpieza del relay.
- Frontend: Reescribir `useChipTTSTT` para usar MediaRecorder + HTTP POST.
- No se modifica `useBrowserSTT`, `useSTT`, ni el arnés de pruebas.

## Tareas

### 1. Backend — Nueva Cloud Function HTTP
**Archivo:** `backend/src/functions/src/routes/sttRoutes.js`

- Agregar `transcribeChirp3` como `onRequest` con `cors: true`, `timeoutSeconds: 60`, `memory: "256MiB"`.
- Autenticación: leer `Authorization: Bearer <Firebase ID token>` del header, verificar con `getAuth().verifyIdToken()`.
- Body esperado (JSON):
  ```json
  {
    "audioContent": "<base64>",
    "languageCode": "es-ES"
  }
  ```
- Lógica: reutilizar `sttService.sendAudioToChirpRecognizer(audioContent, languageCode)` (ya existe y usa la API v2 con `chirp_3`).
- Respuesta exitosa: `{ "transcript": "..." }`.
- Errores: mantener el mismo formato que `transcribeSpeech` (`noSpeech`, `message`, códigos `RATE_LIMITED`, `NO_SPEECH`, etc.).

### 2. Backend — Limpieza
- Eliminar `backend/src/functions/src/sttStreamRelay.js`.
- Eliminar el script `"stt-relay"` de `backend/src/functions/package.json`.
- No se eliminan las dependencias `@google-cloud/speech` ni `ws` del package.json porque `@google-cloud/speech` lo usa el servicio existente; `ws` se puede dejar o quitar, sin impacto.

### 3. Frontend — Reescribir `useChipTTSTT`
**Archivo:** `src/hooks/voice/stt/useChipTTSTT.ts`

- Eliminar toda la lógica de WebSocket, downsample y AudioContext.
- Implementar grabación con `MediaRecorder`:
  - `getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })`.
  - MIME type: `audio/webm;codecs=opus` si está soportado, fallback a `audio/webm`.
  - Al llamar `stop()`, detener el recorder y esperar el `blob` final.
- Al obtener el blob:
  - Convertir a base64 con `FileReader.readAsDataURL`.
  - Determinar encoding: `WEBM_OPUS` o `WEBM` según el MIME type.
  - Llamar a `transcribeSpeech` (servicio existente) o a un nuevo servicio `transcribeChirp3` que apunte a la nueva Cloud Function.
    - **Decisión pendiente:** ¿reusar `transcribeSpeech` existente o crear servicio separado `transcribeChirp3`? (Ver pregunta abajo.)
  - Enviar token Firebase en header `Authorization: Bearer <idToken>`.
- Estado:
  - `isListening`: true mientras graba.
  - `isProcessing`: true mientras espera la respuesta HTTP.
  - `interimTranscript`: siempre `''` (no hay streaming en este modo).
  - `recordingTimeLeft`, `recordingElapsed`: medir con `setInterval` durante la grabación (max 20s como antes).
  - `maxRecordingSeconds`: 20.
- Callbacks:
  - `onFinal(transcript)` al recibir respuesta exitosa.
  - `onError(message)` en fallos de permiso, red, o respuesta sin transcript.
- `transcribeExistingAudio`: mantener la implementación actual que usa `transcribeSpeech`.

### 4. Frontend — Servicio HTTP
**Archivo:** `src/services/voice/stt/chipttStt.ts`

- Agregar `transcribeChirp3(options)` que haga POST a la Cloud Function `transcribeChirp3`.
- Incluir `Authorization: Bearer <idToken>` en el header.
- Usar la misma firma que `transcribeSpeech` para minimizar cambios.

### 5. Variables de entorno
- `.env.local`: eliminar `VITE_STT_WS_URL` (ya no se usa).

## Pregunta pendiente
¿Debemos **reusar el servicio existente `transcribeSpeech`** (que apunta a la Cloud Function `transcribeSpeech` y usa la API v1 `speech:recognize` con WEBM_OPUS), o **crear un servicio nuevo `transcribeChirp3`** que apunte a la nueva Cloud Function `transcribeChirp3` (que usa la API v2 con `chirp_3`)?

- **Opción A (recomendada):** Crear `transcribeChirp3` nuevo. Es más claro, no mezcla endpoints, y el usuario pidió específicamente una función llamada `transcribeChirp3`. El frontend la usa para grabación en vivo; `transcribeSpeech` se mantiene para compatibilidad con `transcribeExistingAudio`.
- **Opción B:** Reusar `transcribeSpeech` para todo. Menos código, pero mezcla el endpoint v1 batch con el flujo en vivo y puede ser confuso.

## Riesgos / Consideraciones
- **Latencia:** HTTP batch tarda ~1-3s por fragmento. No habrá `interimTranscript` en este modo (solo final). El hook debe reflejar eso (`interimTranscript: ''`).
- **Facturación:** Sigue siendo por segundo de audio procesado, pero sin reintentos ciegos como el VAD viejo.
- **Límite de tamaño:** Firebase Functions tiene límite de payload (~10MB). Con MediaRecorder en fragmentos cortos (max 20s), el blob debería estar bien.
- **Compatibilidad con tests:** `useSTT.test.ts` mockea `useChipTTSTT` y verifica `start/stop/abort`. Mientras la interfaz `SttProvider` se mantenga, los tests pasan sin cambios.

## Archivos afectados
- `backend/src/functions/src/sttStreamRelay.js` → eliminar
- `backend/src/functions/package.json` → eliminar script `stt-relay`
- `backend/src/functions/src/routes/sttRoutes.js` → agregar `transcribeChirp3`
- `backend/src/functions/src/services/chipttSttService/api.js` → (posible) exponer `sendAudioToChirpRecognizer` si no lo está ya
- `src/hooks/voice/stt/useChipTTSTT.ts` → reescribir sin WebSocket
- `src/services/voice/stt/chipttStt.ts` → agregar `transcribeChirp3`
- `.env.local` → eliminar `VITE_STT_WS_URL`
