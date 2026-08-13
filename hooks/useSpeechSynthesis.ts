import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveVoiceForLang } from '../services/voice/voicePicker';

const VOICE_CHANGED_TIMEOUT_MS = 2000;
const WATCHDOG_RETRY_DELAY_MS = 300;
const SPEAK_AFTER_CANCEL_DELAY_MS = 50;

export interface SpeakResult {
  ok: boolean;
  voiceName: string | null;
  voicesCount: number;
}

export function useSpeechSynthesis() {
  const supported =
    typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!supported) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, [supported]);

  const ensureVoices = useCallback(async (): Promise<SpeechSynthesisVoice[]> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
    const synth = window.speechSynthesis;
    let current = synth.getVoices();
    if (current.length === 0) {
      // Chrome loads voices asynchronously; wait for voiceschanged or a timeout.
      await new Promise<void>((resolve) => {
        const onVoicesChanged = () => {
          synth.removeEventListener('voiceschanged', onVoicesChanged);
          resolve();
        };
        synth.addEventListener('voiceschanged', onVoicesChanged);
        window.setTimeout(() => {
          synth.removeEventListener('voiceschanged', onVoicesChanged);
          resolve();
        }, VOICE_CHANGED_TIMEOUT_MS);
      });
      current = synth.getVoices();
    }
    if (current.length > 0) {
      setVoices(current);
    }
    return current;
  }, []);

  const unlock = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.resume();
  }, [supported]);

  const speak = useCallback(
    (text: string, lang: string | null, voiceId?: string, rate?: number, pitch?: number): Promise<SpeakResult> => {
      return (async () => {
        if (!supported || !text) {
          return { ok: true, voiceName: null, voicesCount: 0 };
        }

        const synth = window.speechSynthesis;
        const availableVoices = await ensureVoices();

        const speakOnce = (): Promise<SpeakResult> =>
          new Promise((resolve) => {
            synth.cancel();
            synth.resume();
            const utterance = new SpeechSynthesisUtterance(text);
            let voice: SpeechSynthesisVoice | undefined;
            if (voiceId) {
              voice = availableVoices.find((v) => v.voiceURI === voiceId);
            }
            if (!voice) {
              voice = resolveVoiceForLang(lang, availableVoices);
            }
            if (voice) {
              utterance.voice = voice;
              utterance.lang = voice.lang;
            } else if (lang) {
              utterance.lang = lang;
            }
            if (typeof rate === 'number') {
              utterance.rate = rate;
            }
            if (typeof pitch === 'number') {
              utterance.pitch = pitch;
            }
            console.log(
              '[TTS] speak start lang=',
              lang,
              'voices=',
              availableVoices.length,
              'voice=',
              voice?.name ?? '(none)',
              'rate=',
              typeof rate === 'number' ? rate : '(default)',
              'pitch=',
              typeof pitch === 'number' ? pitch : '(default)',
            );

            let settled = false;
            let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

            const settle = (result: boolean) => {
              if (settled) return;
              settled = true;
              if (watchdogTimer) {
                clearTimeout(watchdogTimer);
                watchdogTimer = null;
              }
              utterance.removeEventListener('end', onDone);
              utterance.removeEventListener('error', onError);
              setIsSpeaking(false);
              resolve({ ok: result, voiceName: voice?.name ?? null, voicesCount: availableVoices.length });
            };

            const onDone = () => {
              console.log('[TTS] end');
              settle(true);
            };

            const onError = (event: Event) => {
              console.log('[TTS] error', (event as SpeechSynthesisErrorEvent).error);
              settle(false);
            };

            utterance.addEventListener('end', onDone);
            utterance.addEventListener('error', onError);
            setIsSpeaking(true);

            window.setTimeout(() => {
              synth.speak(utterance);
            }, SPEAK_AFTER_CANCEL_DELAY_MS);

            const estimatedMs = Math.max(4000, Math.min(12000, text.split(/\s+/).length * 1000 + 1500));
            watchdogTimer = setTimeout(() => {
              console.log('[TTS] watchdog timeout, cancelling');
              synth.cancel();
              settle(false);
            }, estimatedMs);
          });

        const first = await speakOnce();
        if (first.ok) return first;

        console.log('[TTS] retry speak');
        await new Promise((resolve) => setTimeout(resolve, WATCHDOG_RETRY_DELAY_MS));
        const second = await speakOnce();
        if (!second.ok) console.log('[TTS] failed after retry');
        return second;
      })();
    },
    [supported, ensureVoices],
  );

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [supported]);

  return useMemo(
    () => ({ supported, voices, isSpeaking, speak, cancel, unlock }),
    [supported, voices, isSpeaking, speak, cancel, unlock],
  );
}
