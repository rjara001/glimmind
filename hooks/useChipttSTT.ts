import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { transcribeSpeech } from '../services/voice/chipttStt';

interface UseChipttSTTOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
}

export interface UseChipttSTTResult {
  supported: boolean;
  isListening: boolean;
  interimTranscript: string;
  start: (lang: string | null) => void;
  stop: () => void;
  abort: () => void;
}

export function useChipttSTT({ onFinal, onInterim, onError }: UseChipttSTTOptions): UseChipttSTTResult {
  const supported =
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof MediaRecorder !== 'undefined';

  const [isListening, setIsListening] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const langRef = useRef<string | null>(null);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);
  const isListeningRef = useRef(false);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const cleanup = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    recorderRef.current = null;

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    chunksRef.current = [];
    setIsListening(false);
    isListeningRef.current = false;
  }, []);

  const start = useCallback(
    (lang: string | null) => {
      if (!supported || isListeningRef.current) return;

      cleanup();

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          streamRef.current = stream;
          langRef.current = lang;
          chunksRef.current = [];

          const mimeType =
            MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
              ? 'audio/webm;codecs=opus'
              : 'audio/webm';

          const recorder = new MediaRecorder(stream, { mimeType });
          recorderRef.current = recorder;

          recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              chunksRef.current.push(event.data);
            }
          };

          recorder.onstop = () => {
            const recordedLang = langRef.current;
            const recordedChunks = chunksRef.current;
            chunksRef.current = [];

            setIsListening(false);
            isListeningRef.current = false;

            if (recordedChunks.length === 0) {
              onErrorRef.current?.('No audio captured.');
              return;
            }

            const blob = new Blob(recordedChunks, { type: mimeType });

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => {
              const dataUrl = reader.result as string;
              const base64 = dataUrl.split(',')[1];
              if (!base64) {
                onErrorRef.current?.('Failed to encode audio.');
                return;
              }

              const encoding = mimeType.includes('ogg')
                ? 'OGG_OPUS'
                : mimeType.includes('opus')
                  ? 'WEBM_OPUS'
                  : 'WEBM';

              void transcribeSpeech({
                audioContent: base64,
                encoding,
                sampleRateHertz: 48000,
                languageCode: recordedLang || undefined,
              })
                .then((result) => {
                  if (!isListeningRef.current) return;
                  const trimmed = result.transcript.trim();
                  if (trimmed) {
                    onFinalRef.current(trimmed);
                  } else {
                    onErrorRef.current?.('No speech detected.');
                  }
                })
                .catch((error) => {
                  if (!isListeningRef.current) return;
                  console.error('[Chiptt] transcribeSpeech failed:', error);
                  onErrorRef.current?.(error instanceof Error ? error.message : 'STT error.');
                });
            };

            reader.onerror = () => {
              onErrorRef.current?.('Failed to read audio.');
            };
          };

          recorder.onerror = () => {
            if (!isListeningRef.current) return;
            cleanup();
            onErrorRef.current?.('Recording error.');
          };

          recorder.start();
          setIsListening(true);
          isListeningRef.current = true;
        })
        .catch((error) => {
          console.error('[Chiptt] getUserMedia failed:', error);
          onErrorRef.current?.(error instanceof Error ? error.message : 'Microphone access denied.');
        });
    },
    [supported, cleanup],
  );

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {
        // ignore
      }
    }
    // The recorder.onstop handler will perform the transcription
  }, []);

  const abort = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return useMemo(
    () => ({
      supported,
      isListening,
      interimTranscript: '',
      start,
      stop,
      abort,
    }),
    [supported, isListening, start, stop, abort],
  );
}
