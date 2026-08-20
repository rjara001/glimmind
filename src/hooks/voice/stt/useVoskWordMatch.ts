import { useCallback, useEffect, useRef, useState } from 'react';
import { createModel, KaldiRecognizer, Model } from 'vosk-browser';

const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz';
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
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [partial, setPartial] = useState('');

  const modelRef = useRef<Model | null>(null);
  const recognizerRef = useRef<KaldiRecognizer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const expectedWordsRef = useRef(expectedWords);
  const onMatchRef = useRef(onMatch);
  const onMismatchRef = useRef(onMismatch);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    expectedWordsRef.current = expectedWords;
  }, [expectedWords]);
  useEffect(() => {
    onMatchRef.current = onMatch;
  }, [onMatch]);
  useEffect(() => {
    onMismatchRef.current = onMismatch;
  }, [onMismatch]);
  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const loadModel = useCallback(async (): Promise<Model> => {
    if (modelRef.current) return modelRef.current;
    setIsModelLoading(true);
    try {
      const model = await createModel(MODEL_URL);
      modelRef.current = model;
      return model;
    } catch (error) {
      onErrorRef.current?.(
        error instanceof Error ? error.message : 'Failed to load Vosk model.',
      );
      throw error;
    } finally {
      setIsModelLoading(false);
    }
  }, []);

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
  }, []);

  const start = useCallback(async () => {
    if (recognizerRef.current) return;

    const model = await loadModel();

    const grammar = [...expectedWordsRef.current, '[unk]'];
    const recognizer = new model.KaldiRecognizer(SAMPLE_RATE, JSON.stringify(grammar));
    recognizerRef.current = recognizer;

    recognizer.on('result', (message) => {
      const resultMessage = message as { result: { text: string } };
      const heard = resultMessage.result.text?.trim().toLowerCase();
      if (!heard || heard === '[unk]') {
        onMismatchRef.current?.(heard || '');
        return;
      }
      const match = expectedWordsRef.current.find(
        (w) => w.toLowerCase() === heard,
      );
      if (match) {
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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (event) => {
        recognizerRef.current?.acceptWaveform(event.inputBuffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);

      setIsListening(true);
    } catch (error) {
      onErrorRef.current?.(
        error instanceof Error ? error.message : 'Microphone access denied.',
      );
      cleanup();
    }
  }, [loadModel, cleanup]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => {
      cleanup();
      modelRef.current?.terminate();
      modelRef.current = null;
    };
  }, [cleanup]);

  return { isListening, isModelLoading, partial, start, stop };
}
