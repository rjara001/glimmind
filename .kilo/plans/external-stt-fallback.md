# Nice-to-have: External Speech-to-Text fallback

## Problem

Web Speech API (`SpeechRecognition`) works well for common words, but fails with low-frequency or phonetically ambiguous words.

Example:
- expected: `subverted`
- recognized: `celebrity`

This is not a text-similarity issue. The recognizer simply misheard the acoustic signal and produced a completely different word from its internal model.

## Current limitation

Today the app only receives text from `SpeechRecognition`. There is no pronunciation score, no phoneme-level data, and no way to ask “was the user close enough?”. If the recognizer returns the wrong word, the app cannot recover.

## Proposed fallback (future)

When local STT returns a transcript with very low similarity to the expected answer, optionally send the captured audio to an external speech-to-text service and use **its transcript** as the source of truth.

Flow:
```
User speaks
    ↓
SpeechRecognition → text A
    ↓
evaluateAnswer(expected, text A) → low similarity
    ↓
External STT (audio) → text B
    ↓
evaluateAnswer(expected, text B)
    ↓
Accept / reject
```

## Why external STT, not LLM comparison

- LLMs are good at language, not at judging whether two spoken tokens are acoustically similar.
- The failure mode here is **recognition**, not **translation**.
- A specialized STT model (Whisper, Deepgram, Google Speech-to-Text) is more likely to recover the actual spoken word from audio than an LLM is to decide that “subverted” and “celebrity” are close.

## Constraints

- Must remain opt-in. Many users will not need it.
- Requires audio capture. The current browser `SpeechRecognition` API does not expose the raw audio buffer. We may need to capture audio separately via `MediaRecorder` / `AudioContext`.
- Network latency and cost matter. This should only trigger on failure, not on every card.
- Privacy: audio leaves the device only if the user enables this.

## Possible implementation sketch

### 1. Audio capture layer
Add an optional audio recorder alongside `SpeechRecognition`:
- `MediaRecorder` or `AudioContext.createMediaStreamSource`
- Store the last N seconds of audio in a ref/buffer
- When fallback triggers, encode to `webm`/`wav` and upload

### 2. Fallback service
```ts
interface ExternalSttResult {
  transcript: string;
  confidence?: number;
}

async function fallbackExternalStt(
  audioBlob: Blob,
  lang: string,
): Promise<ExternalSttResult> {
  // POST to external STT provider
  // return transcript
}
```

### 3. Integration point
In `useGameVoice` / `useVoiceSession`:
- After `evaluateAnswer` returns low similarity
- And before marking incorrect
- Check if `settings.externalSttEnabled === true`
- If yes, capture audio, send to external STT, re-evaluate with new transcript

### 4. Settings
- `externalSttEnabled: boolean`
- `externalSttProvider: 'whisper' | 'deepgram' | 'google'`
- `externalSttApiKey: string` (stored securely, never logged)

## Open questions

- Which provider gives the best accuracy vs latency for short words?
- Should we pre-capture audio continuously, or start recording only when needed?
- How to handle cases where external STT also fails?
- Should the user see “External STT fallback…” in the UI for transparency?

## Status

Not implemented. Documented as future improvement.
