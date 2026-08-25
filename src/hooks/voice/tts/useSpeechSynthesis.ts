import { useCallback, useEffect, useMemo, useState } from 'react';
import { VoiceProvider } from '../../../types';
import { resolveVoiceForLang } from '../../../services/voice/tts/voicePicker';
import {
  getDefaultChirpVoiceId,
  isChirpVoiceId,
} from '../../../services/voice/tts/chirpVoices';
import { useChirpTTS } from './useChirpTTS';

const VOICE_CHANGED_TIMEOUT_MS = 2000;
const WATCHDOG_RETRY_DELAY_MS = 300;
const SPEAK_AFTER_CANCEL_DELAY_MS = 50;

export interface SpeakResult {
  ok: boolean;
  /** Which engine actually produced the audio ('chirp' or the browser fallback). */
  engine: 'chirp' | 'browser';
  voiceName: string | null;
  voicesCount: number;
  error?: string;
}

/**
 * Divide textos largos en fragmentos naturales (puntuación/saltos de línea)
 * para evitar el congelamiento nativo de Chrome (~15s) y mejorar la respuesta del watchdog.
 */
function splitTextIntoChunks(text: string): string[] {
  const rawChunks = text.split(/(?<=[.,?!;\n])\s+/);
  const chunks: string[] = [];

  for (const chunk of rawChunks) {
    const trimmed = chunk.trim();
    if (trimmed.length > 0) {
      chunks.push(trimmed);
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

export function useSpeechSynthesis(
  provider: VoiceProvider = 'browser'
) {
  const supported =
    typeof window !== 'undefined' &&
    'speechSynthesis' in window;

  const [voices, setVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const [isSpeaking, setIsSpeaking] =
    useState(false);

  const chirp = useChirpTTS();

  useEffect(() => {
    if (!supported) return;

    const loadVoices = () =>
      setVoices(
        window.speechSynthesis.getVoices()
      );

    loadVoices();

    window.speechSynthesis.addEventListener(
      'voiceschanged',
      loadVoices
    );

    return () =>
      window.speechSynthesis.removeEventListener(
        'voiceschanged',
        loadVoices
      );
  }, [supported]);

  const ensureVoices = useCallback(
    async (): Promise<SpeechSynthesisVoice[]> => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      ) {
        return [];
      }

      const synth = window.speechSynthesis;
      let current = synth.getVoices();

      if (current.length === 0) {
        await new Promise<void>((resolve) => {
          const onVoicesChanged = () => {
            synth.removeEventListener(
              'voiceschanged',
              onVoicesChanged
            );
            resolve();
          };

          synth.addEventListener(
            'voiceschanged',
            onVoicesChanged
          );

          window.setTimeout(() => {
            synth.removeEventListener(
              'voiceschanged',
              onVoicesChanged
            );
            resolve();
          }, VOICE_CHANGED_TIMEOUT_MS);
        });

        current = synth.getVoices();
      }

      if (current.length > 0) {
        setVoices(current);
      }

      return current;
    },
    []
  );

  const unlock = useCallback(() => {
    if (!supported) return;

    window.speechSynthesis.resume();
  }, [supported]);

  const speak = useCallback(
    (
      text: string,
      lang: string | null,
      voiceId?: string,
      rate?: number,
      pitch?: number
    ): Promise<SpeakResult> => {
      return (async () => {
        if (!supported || !text) {
          return {
            ok: true,
            engine: 'browser',
            voiceName: null,
            voicesCount: 0,
          };
        }

        const resolvedChirpVoiceId =
          provider === 'chirp'
            ? isChirpVoiceId(voiceId)
              ? voiceId
              : getDefaultChirpVoiceId(
                  lang || 'es'
                )
            : undefined;

        if (provider === 'chirp') {
          if (resolvedChirpVoiceId) {
            const chirpResult =
              await chirp.speak(
                text,
                resolvedChirpVoiceId,
                rate,
                pitch
              );

            if (chirpResult.ok) {
              return chirpResult;
            }

            console.warn('[TTS][FALLBACK_TO_BROWSER]', {
              reason: chirpResult.error ?? 'unknown',
              textLength: text.length,
              voiceId: resolvedChirpVoiceId,
            });
          } else {
            console.warn('[TTS][FALLBACK_TO_BROWSER]', {
              reason: 'no-chirp-voice-resolved',
              lang,
              voiceId: voiceId ?? null,
            });
          }
        }

        const synth = window.speechSynthesis;
        const availableVoices = await ensureVoices();

        const speakOnce =
          (): Promise<SpeakResult> =>
            new Promise(async (resolve) => {
              const t0 = performance.now();

              console.log('[TTS][CLEAR_QUEUE]');
              synth.cancel();
              synth.resume();

              let voice: SpeechSynthesisVoice | undefined;

              if (voiceId) {
                const candidate = availableVoices.find(
                  (v) => v.voiceURI === voiceId
                );

                if (
                  candidate &&
                  (!lang ||
                    candidate.lang
                      .toLowerCase()
                      .startsWith(String(lang).toLowerCase()))
                ) {
                  voice = candidate;
                }
              }

              if (!voice) {
                voice = resolveVoiceForLang(lang, availableVoices);
              }

              const chunks = splitTextIntoChunks(text);
              const adjustedRate = typeof rate === 'number' && rate > 0 ? rate : 1;

              setIsSpeaking(true);

              // Función para reproducir un fragmento individual
              const speakChunk = (chunkText: string): Promise<boolean> => {
                return new Promise((resolveChunk) => {
                  const utterance = new SpeechSynthesisUtterance(chunkText);

                  if (voice) {
                    utterance.voice = voice;
                    utterance.lang = voice.lang;
                  } else if (lang) {
                    utterance.lang = lang;
                  }

                  if (typeof rate === 'number') utterance.rate = rate;
                  if (typeof pitch === 'number') utterance.pitch = pitch;

                  let settled = false;
                  let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

                  const settleChunk = (result: boolean) => {
                    if (settled) return;
                    settled = true;

                    if (watchdogTimer) {
                      clearTimeout(watchdogTimer);
                      watchdogTimer = null;
                    }

                    utterance.removeEventListener('end', onDone);
                    utterance.removeEventListener('error', onError);
                    resolveChunk(result);
                  };

                  const onDone = () => {
                    console.log('[TTS][CHUNK_END]', {
                      elapsedMs: Math.round(performance.now() - t0),
                      chunkText,
                    });
                    settleChunk(true);
                  };

                  const onError = (event: Event) => {
                    console.log('[TTS][ERROR]', {
                      elapsedMs: Math.round(performance.now() - t0),
                      eventType: event.type,
                      error: (event as any)?.error,
                      voiceName: voice?.name ?? null,
                    });
                    settleChunk(false);
                  };

                  utterance.addEventListener('end', onDone);
                  utterance.addEventListener('error', onError);

                  // Watchdog holgado individual por fragmento (Mínimo 15s por frase corta)
                  const wordCount = chunkText.split(/\s+/).length;
                  const estimatedChunkMs = Math.max(
                    15000,
                    (wordCount * 1500 + 4000) / adjustedRate
                  );

                  watchdogTimer = setTimeout(() => {
                    console.warn('[TTS][WATCHDOG] Chunk timed out', {
                      chunkText,
                      estimatedChunkMs,
                    });
                    synth.cancel();
                    settleChunk(false);
                  }, estimatedChunkMs);

                  window.setTimeout(() => {
                    synth.speak(utterance);
                  }, SPEAK_AFTER_CANCEL_DELAY_MS);
                });
              };

              console.log('[TTS][START]', {
                provider,
                text,
                chunksCount: chunks.length,
                rate,
                pitch,
                voiceId,
              });

              // Reproduce secuencialmente cada fragmento
              let allOk = true;
              for (const chunk of chunks) {
                const chunkOk = await speakChunk(chunk);
                if (!chunkOk) {
                  allOk = false;
                  break;
                }
              }

              setIsSpeaking(false);

              resolve({
                ok: allOk,
                engine: 'browser',
                voiceName: voice?.name ?? null,
                voicesCount: availableVoices.length,
              });
            });

        const first = await speakOnce();

        if (first.ok) {
          return first;
        }

        console.warn('[TTS][RETRY]', {
          provider,
          text,
          voiceId,
          rate,
          pitch,
          firstResult: first,
        });

        await new Promise((resolve) =>
          setTimeout(resolve, WATCHDOG_RETRY_DELAY_MS)
        );

        const second = await speakOnce();

        console.warn('[TTS][DIAG] speak', {
          provider,
          text,
          voiceId,
          rate,
          pitch,
          result: second,
        });

        return second;
      })();
    },
    [supported, ensureVoices, provider, chirp]
  );

  const cancel = useCallback(() => {
    if (!supported) return;

    console.log('[TTS][CANCEL]', {
      speaking: window.speechSynthesis.speaking,
    });
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    chirp.cancel();
  }, [supported, chirp]);

  return useMemo(
    () => ({
      supported,
      voices,
      isSpeaking,
      speak,
      cancel,
      unlock,
    }),
    [supported, voices, isSpeaking, speak, cancel, unlock]
  );
}