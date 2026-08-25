import { useState, useCallback, useMemo, useRef } from 'react';
import { synthesizeSpeech } from '../../../services/voice/tts/chirpTts';
import { SpeakResult } from './useSpeechSynthesis';

function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

export function useChirpTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const playingSinceRef = useRef<number | null>(null);

  const cleanup = useCallback(() => {
    if (playingSinceRef.current !== null) {
      console.warn('[TTS][CHIRP][INTERRUPTED]', {
        playElapsedMs: Math.round(performance.now() - playingSinceRef.current),
        stack: new Error().stack ?? null,
      });
      playingSinceRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const cancel = useCallback(() => {
    cleanup();
  }, [cleanup]);

  const speak = useCallback(
    async (text: string, voiceId: string, rate?: number, pitch?: number): Promise<SpeakResult> => {
      cleanup();

      const startedAt = performance.now();
      console.log('[TTS][CHIRP][START]', {
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
        voiceId,
        rate: rate ?? null,
        pitch: pitch ?? null,
      });

      try {
        const result = await synthesizeSpeech(text, voiceId, rate, pitch);

        console.log('[TTS][CHIRP][SYNTH_OK]', {
          elapsedMs: Math.round(performance.now() - startedAt),
          audioBytes: result.audioContent.length,
        });

        const blob = await fetch(`data:audio/mp3;base64,${result.audioContent}`).then((r) => {
          if (!r.ok) throw new Error('Failed to decode audio');
          return r.blob();
        });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        return new Promise((resolve) => {
          function settle(
            speakResult: SpeakResult,
            logEvent: string,
            logData: Record<string, unknown>,
          ) {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            console.log(logEvent, logData);
            cleanup();
            resolve(speakResult);
          }

          const onEnded = () => {
            playingSinceRef.current = null;
            settle(
              { ok: true, engine: 'chirp', voiceName: voiceId, voicesCount: 0 },
              '[TTS][CHIRP][ENDED]',
              {
                elapsedMs: Math.round(performance.now() - startedAt),
                audioDurationMs: Number.isFinite(audio.duration)
                  ? Math.round(audio.duration * 1000)
                  : null,
              },
            );
          };

          const onError = () => {
            playingSinceRef.current = null;
            settle(
              {
                ok: false,
                engine: 'chirp',
                voiceName: voiceId,
                voicesCount: 0,
                error: audio.error?.message || 'Audio element error',
              },
              '[TTS][CHIRP][AUDIO_ERROR]',
              {
                elapsedMs: Math.round(performance.now() - startedAt),
                errorCode: audio.error?.code ?? null,
                errorMessage: audio.error?.message ?? null,
              },
            );
          };

          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);
          setIsSpeaking(true);
          playingSinceRef.current = performance.now();

          console.log('[TTS][CHIRP][PLAY]', {
            elapsedMs: Math.round(performance.now() - startedAt),
            blobSize: blob.size,
          });

          audio.play().catch((playError: unknown) => {
            playingSinceRef.current = null;
            const message = extractErrorMessage(playError);
            settle(
              { ok: false, engine: 'chirp', voiceName: voiceId, voicesCount: 0, error: message },
              '[TTS][CHIRP][PLAY_REJECTED]',
              {
                elapsedMs: Math.round(performance.now() - startedAt),
                error: message,
              },
            );
          });
        });
      } catch (error) {
        const message = extractErrorMessage(error);
        console.warn('[TTS][CHIRP][SYNTH_FAIL]', {
          elapsedMs: Math.round(performance.now() - startedAt),
          error: message,
        });
        cleanup();
        return { ok: false, engine: 'chirp', voiceName: voiceId, voicesCount: 0, error: message };
      }
    },
    [cleanup],
  );

  return useMemo(() => ({ speak, cancel, isSpeaking }), [speak, cancel, isSpeaking]);
}
