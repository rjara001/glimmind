import { useState, useCallback, useMemo, useRef } from 'react';
import { synthesizeSpeech } from '../../services/voice/chirpTts';
import { SpeakResult } from './useSpeechSynthesis';

export function useChirpTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
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

      try {
        const result = await synthesizeSpeech(text, voiceId, rate, pitch);
        const blob = await fetch(`data:audio/mp3;base64,${result.audioContent}`).then((r) => {
          if (!r.ok) throw new Error('Failed to decode audio');
          return r.blob();
        });
        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        return new Promise((resolve) => {
          const onEnded = () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            cleanup();
            resolve({ ok: true, voiceName: voiceId, voicesCount: 0 });
          };
          const onError = () => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            cleanup();
            resolve({ ok: false, voiceName: voiceId, voicesCount: 0 });
          };
          audio.addEventListener('ended', onEnded);
          audio.addEventListener('error', onError);
          setIsSpeaking(true);
          audio.play().catch(() => {
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
            cleanup();
            resolve({ ok: false, voiceName: voiceId, voicesCount: 0 });
          });
        });
      } catch (error) {
        cleanup();
        return { ok: false, voiceName: voiceId, voicesCount: 0 };
      }
    },
    [cleanup],
  );

  return useMemo(() => ({ speak, cancel, isSpeaking }), [speak, cancel, isSpeaking]);
}
