import { useCallback, useEffect, useRef, useState } from 'react';
import { KaldiRecognizer } from 'vosk-browser';
import { useVoskModelContext } from '@/context/VoskModelContext';

const SAMPLE_RATE = 16000;

export interface UseVoskWordMatchOptions {
  expectedWords: string[];
  onMatch: (word: string, confidence: number) => void;
  onMismatch?: (heard: string) => void;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
}

export interface VoskWordMatchState {
  isListening: boolean;
  isModelLoading: boolean;
  isModelReady: boolean;
  partial: string;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoskWordMatch({
  expectedWords,
  onMatch,
  onMismatch,
  onInterim,
  onError,
}: UseVoskWordMatchOptions): VoskWordMatchState {
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState('');

  const { model, isReady, isLoading } = useVoskModelContext();

  const recognizerRef = useRef<KaldiRecognizer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const expectedWordsRef = useRef(expectedWords);
  const onMatchRef = useRef(onMatch);
  const onMismatchRef = useRef(onMismatch);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);

  useEffect(() => { expectedWordsRef.current = expectedWords; }, [expectedWords]);
  useEffect(() => { onMatchRef.current = onMatch; }, [onMatch]);
  useEffect(() => { onMismatchRef.current = onMismatch; }, [onMismatch]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const cleanup = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (recognizerRef.current) {
      recognizerRef.current.remove();
      recognizerRef.current = null;
    }
    setIsListening(false);
    setPartial('');
    console.log('[Vosk Matcher] Micrófono y procesador de audio liberados.');
  }, []);

  const start = useCallback(async () => {
    if (recognizerRef.current) return;

    if (!isReady || !model) {
      const msg = 'El modelo Vosk aún se está descargando en segundo plano.';
      console.warn('[Vosk Matcher]', msg);
      onErrorRef.current?.(msg);
      return;
    }

    try {
      console.log('[Vosk Matcher] Creando instancia de KaldiRecognizer...');
      const grammar = [...expectedWordsRef.current, '[unk]'];
      const recognizer = new model.KaldiRecognizer(SAMPLE_RATE, JSON.stringify(grammar));
      recognizerRef.current = recognizer;

      recognizer.on('result', (message) => {
        const resultMessage = message as { result: { text: string } };
        const heard = resultMessage.result.text?.trim().toLowerCase();

        console.log('[Vosk Matcher] Texto reconocido:', heard);

        if (!heard || heard === '[unk]') {
          onMismatchRef.current?.(heard || '');
          return;
        }

        const match = expectedWordsRef.current.find(
          (w) => w.toLowerCase() === heard,
        );

        if (match) {
          console.log('[Vosk Matcher] Match exacto:', match);
          onMatchRef.current(match, 1);
        } else {
          onMismatchRef.current?.(heard);
        }
      });

      recognizer.on('partialresult', (message) => {
        const partialMessage = message as { result: { partial: string } };
        const text = partialMessage.result.partial;
        setPartial(text);
        onInterimRef.current?.(text);
      });

      console.log('[Vosk Matcher] Solicitando micrófono...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: SAMPLE_RATE });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        recognizerRef.current?.acceptWaveform(event.inputBuffer);
      };

      const silence = audioContext.createGain();
      silence.gain.value = 0;

      source.connect(processor);
      processor.connect(silence);
      silence.connect(audioContext.destination);

      setIsListening(true);
      console.log('[Vosk Matcher] Escuchando...');
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al acceder al micrófono';
      console.error('[Vosk Matcher] Error:', errorMsg);
      onErrorRef.current?.(errorMsg);
      cleanup();
    }
  }, [isReady, model, cleanup]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    isListening,
    isModelLoading: isLoading,
    isModelReady: isReady,
    partial,
    start,
    stop,
  };
}