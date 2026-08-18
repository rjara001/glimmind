# STT Fallback Mechanism

**Status:** Draft — Source of truth  
**Scope:** Speech-to-Text fallback inside `useVoiceSession` / `useSTT`  
**Related:** `.kilo/plans/external-stt-fallback.md`, `hooks/voice/stt/useBrowserSTT.ts`, `hooks/voice/stt/useChipTTSTT.ts`

---

## Rule (canonical behavior)

Inside a single voice session, STT must follow this sequence:

1. **Browser STT attempts:** up to **3 attempts** on the browser-native recognizer (`SpeechRecognition`).
2. **Evaluation per attempt:** each attempt produces a transcript; it is compared against the expected answer using the existing similarity/threshold logic.
3. **Fallback trigger:** if the 3 browser attempts fail (similarity below threshold / no-speech / error), the session must switch to **Chirp STT**.
4. **Chirp attempt with prior audio:** the 3 previous browser recordings are sent to the external Chirp STT service for transcription.
5. **Recycle on Chirp failure:** if Chirp also fails to recognize, the flow returns to a fresh cycle of 3 browser STT attempts.

This is the **only** documented fallback behavior for STT. Any other plan or document contradicting this must be considered superseded by this one.

---

## Detailed flow

```
playCurrentWord()
  └─ Browser STT attempt 1
       ├─ transcript A → evaluateAnswer(expected, A)
       │    ├─ similarity >= threshold → accept
       │    └─ similarity < threshold  → continue
       └─ Browser STT attempt 2
            ├─ transcript B → evaluateAnswer(expected, B)
            │    ├─ similarity >= threshold → accept
            │    └─ similarity < threshold  → continue
            └─ Browser STT attempt 3
                 ├─ transcript C → evaluateAnswer(expected, C)
                 │    ├─ similarity >= threshold → accept
                 │    └─ similarity < threshold  → FALLBACK
                 └─ Chirp STT (audio from attempts 1+2+3)
                      ├─ transcript D → evaluateAnswer(expected, D)
                      │    ├─ similarity >= threshold → accept
                      │    └─ similarity < threshold  → RECYCLE
                      └─ restart: Browser STT attempts 1-3 again
```

---

## Integration points (existing code)

| File | Role | Notes |
|---|---|---|
| `hooks/voice/useVoiceSession.ts` | Orchestrator | Must track `browserAttemptCount` per association. Must hold audio blobs from browser attempts. Must trigger Chirp STT and handle recycle. |
| `hooks/voice/stt/useBrowserSTT.ts` | Browser recognizer | Currently emits final transcripts only. Must also expose captured audio chunks for fallback upload. |
| `hooks/voice/stt/useChipTTSTT.ts` | Chirp recognizer | Currently records fresh audio on `start()`. Must also accept an external `Blob` to transcribe (fallback path). |
| `services/voice/chipttStt.ts` | Chirp API client | Must add a `transcribeExistingAudio()` path that accepts base64 audio instead of recording. |
| `services/gameEngine.ts` | Answer evaluation | Reuse existing `setUserInput().checkAnswer()` similarity logic. No change expected. |

---

## Constraints

- The browser recognizer does **not** expose raw audio via the Web Speech API. Audio must be captured in parallel using `MediaRecorder` / `AudioContext` during browser attempts.
- Fallback must be **opt-in** via `list.settings.voiceSttFallback` (already present in `types.ts:52`).
- If the user does not enable fallback, behavior remains: up to 3 browser attempts, then mark incorrect.
- Chirp quota/cost constraints apply; fallback must not trigger on every card, only after 3 browser failures.
- The recycle loop has no hard limit in this document; if further limits are needed, mark as future enhancement.

---

## Pseudocode

```ts
type SttAttempt = { transcript: string; audioBlob: Blob };

async function runSttWithFallback(list, currentAssociation) {
  const maxBrowserAttempts = 3;
  const browserTranscripts: SttAttempt[] = [];

  while (true) {
    // 1. Browser phase
    for (let i = 0; i < maxBrowserAttempts; i++) {
      const result = await recordBrowserAnswer();
      browserTranscripts.push(result);

      const evaluated = evaluate(result.transcript, expectedAnswer);
      if (evaluated.passed) return evaluated;

      // user manually submitted typed fallback or stopped
      if (result.manualSubmit) return result.evaluation;
    }

    // 2. Chirp fallback phase
    if (!list.settings.voiceSttFallback) {
      return fail("Incorrect after 3 browser attempts.");
    }

    const chirpTranscript = await transcribeWithChirp(
      combineBlobs(browserTranscripts.map(a => a.audioBlob)),
      lang
    );

    const chirpEvaluated = evaluate(chirpTranscript, expectedAnswer);
    if (chirpEvaluated.passed) return chirpEvaluated;

    // 3. Recycle
    browserTranscripts.length = 0;
    // loop restarts
  }
}
```

---

## Validation logs

Every attempt in the fallback flow must emit a structured log entry so the flow can be audited and debugged.

Required log fields:
- `sttFallbackAttempt`: `1` | `2` | `3` | `chirp` | `recycle`
- `listId`
- `cardId`
- `provider`: `browser` | `chiptt`
- `transcript`: raw transcript from the attempt
- `similarity`: number or `null`
- `threshold`: number
- `passed`: boolean
- `audioBlobSizeBytes`: number
- `error`: string or `null`

Example log points:
- Browser attempt 1 final transcript received → log `{ sttFallbackAttempt: '1', provider: 'browser', ... }`
- Browser attempt 1 evaluated and failed → log `{ sttFallbackAttempt: '1', similarity: 0.12, passed: false, ... }`
- Browser attempt 3 failed → log `{ sttFallbackAttempt: '3', ... }` then trigger Chirp path
- Chirp request sent → log `{ sttFallbackAttempt: 'chirp', audioBlobSizeBytes: 45231, ... }`
- Chirp response received → log `{ sttFallbackAttempt: 'chirp', transcript: '...', ... }`
- Recycle triggered → log `{ sttFallbackAttempt: 'recycle', ... }`

Logs must be emitted before advancing state so the sequence is always reconstructible from the console.

---

## Chirp STT endpoint (validation reference)

```bash
curl -X POST "https://eu-speech.googleapis.com/v2/projects/${PROJECT_ID}/locations/eu/recognizers/_:recognize" -H "Authorization: Bearer $(gcloud auth print-access-token)" -H "x-goog-user-project: ${PROJECT_ID}" -H "Content-Type: application/json; charset=utf-8" -d "{\"config\": {\"auto_decoding_config\": {}, \"language_codes\": [\"en-US\"], \"model\": \"chirp_3\"}, \"content\": \"${AUDIO_BASE64}\"}"
```

Response shape:
```json
{
  "metadata": {
    "totalBilledDuration": "2s",
    "requestId": "7d629a53-0000-2d87-afc3-5c337bc7afb3",
    "prompt": "Transcribe the following speech segment in English..."
  },
  "results": [
    {
      "alternatives": [
        {
          "transcript": "next"
        }
      ],
      "languageCode": "en-US"
    }
  ]
}
```

Notes:
- `results[0].alternatives[0].transcript` is the transcript to use.
- `metadata.totalBilledDuration` can be logged for quota diagnostics.
- This endpoint is the target for the `transcribeExistingAudio()` backend path.

---

## Open questions

1. **Audio combination strategy:** concatenate the 3 browser blobs sequentially, or pick the longest/silence-trimmed segment?  
   *Recommendation:* send each blob separately and pick the best Chirp transcript; avoids concatenation artifacts.
2. **User visibility:** should the UI show "External STT fallback…" when Chirp is invoked?  
   *Recommendation:* yes, brief toast/toast-like indicator for transparency.
3. **Recycle limit:** should there be a max total number of fallback cycles per card to prevent infinite loops?  
   *Recommendation:* yes, cap at 2 full cycles (6 browser + 2 Chirp) then mark incorrect.

---

## Validation

- Unit test: simulate 3 low-similarity browser transcripts → verify Chirp path is invoked.
- Unit test: simulate Chirp failure → verify browser cycle restarts.
- Manual: real device with noisy audio, verify fallback activates only after 3 failed browser attempts.
