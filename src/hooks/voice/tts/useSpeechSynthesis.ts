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
  voiceName: string | null;
  voicesCount: number;
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
            voiceName: null,
            voicesCount: 0,
          };
        }

        /*
         * IMPORTANT:
         * Chirp must never receive a Browser voice ID.
         *
         * If the persisted voiceId belongs to Browser,
         * or is missing, resolve a valid Chirp voice from
         * the selected language.
         */
        const resolvedChirpVoiceId =
          provider === 'chirp'
            ? isChirpVoiceId(voiceId)
              ? voiceId
              : getDefaultChirpVoiceId(
                  lang || 'es'
                )
            : undefined;

        if (provider === 'chirp' && resolvedChirpVoiceId) {
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
        }

        const synth =
          window.speechSynthesis;

        const availableVoices =
          await ensureVoices();

        const speakOnce =
          (): Promise<SpeakResult> =>
            new Promise((resolve) => {
              synth.cancel();
              synth.resume();

              const utterance =
                new SpeechSynthesisUtterance(
                  text
                );

              let voice:
                | SpeechSynthesisVoice
                | undefined;

              /*
               * Browser fallback keeps its existing
               * voice resolution behavior.
               */
              if (voiceId) {
                const candidate =
                  availableVoices.find(
                    (v) =>
                      v.voiceURI === voiceId
                  );

                if (
                  candidate &&
                  (!lang ||
                    candidate.lang
                      .toLowerCase()
                      .startsWith(
                        String(
                          lang
                        ).toLowerCase()
                      ))
                ) {
                  voice = candidate;
                }
              }

              if (!voice) {
                voice =
                  resolveVoiceForLang(
                    lang,
                    availableVoices
                  );
              }

              if (voice) {
                utterance.voice = voice;
                utterance.lang =
                  voice.lang;
              } else if (lang) {
                utterance.lang = lang;
              }

              if (
                typeof rate === 'number'
              ) {
                utterance.rate = rate;
              }

              if (
                typeof pitch === 'number'
              ) {
                utterance.pitch = pitch;
              }

              let settled = false;

              let watchdogTimer:
                | ReturnType<
                    typeof setTimeout
                  >
                | null = null;

              const settle = (
                result: boolean
              ) => {
                if (settled) return;

                settled = true;

                if (watchdogTimer) {
                  clearTimeout(
                    watchdogTimer
                  );
                  watchdogTimer = null;
                }

                utterance.removeEventListener(
                  'end',
                  onDone
                );

                utterance.removeEventListener(
                  'error',
                  onError
                );

                setIsSpeaking(false);

                resolve({
                  ok: result,
                  voiceName:
                    voice?.name ?? null,
                  voicesCount:
                    availableVoices.length,
                });
              };

              const onDone = () => {
                settle(true);
              };

              const onError = (
                event: Event
              ) => {
                settle(false);
              };

              utterance.addEventListener(
                'end',
                onDone
              );

              utterance.addEventListener(
                'error',
                onError
              );

              setIsSpeaking(true);

              window.setTimeout(() => {
                synth.speak(
                  utterance
                );
              }, SPEAK_AFTER_CANCEL_DELAY_MS);

              const estimatedMs =
                Math.max(
                  8000,
                  Math.min(
                    20000,
                    text.split(/\s+/)
                        .length *
                      1200 +
                      2000
                  )
                );

              watchdogTimer =
                setTimeout(() => {
                  synth.cancel();
                  settle(false);
                }, estimatedMs);
            });

        const first =
          await speakOnce();

        if (first.ok) {
          return first;
        }

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              WATCHDOG_RETRY_DELAY_MS
            )
        );

        const second =
          await speakOnce();

        const result = second;

        console.warn(
          '[TTS][DIAG] speak',
          {
            provider,
            text,
            voiceId,
            rate,
            pitch,
            result,
          }
        );

        return result;
      })();
    },
    [
      supported,
      ensureVoices,
      provider,
      chirp,
    ]
  );

  const cancel = useCallback(() => {
    if (!supported) return;

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
    [
      supported,
      voices,
      isSpeaking,
      speak,
      cancel,
      unlock,
    ]
  );
}