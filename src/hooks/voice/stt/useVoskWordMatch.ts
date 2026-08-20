import { useCallback, useEffect, useRef, useState } from 'react';
import { KaldiRecognizer } from 'vosk-browser';
import { useVoskModelContext } from '@/context/VoskModelContext';

const SAMPLE_RATE = 16000;

export interface UseVoskWordMatchOptions {
  expectedWords: string[];
  commandWords?: string[];
  minCommandConfidence?: number;
  onMatch: (word: string, confidence: number) => void;
  onMismatch?: (heard: string) => void;
  onInterim?: (text: string) => void;
  onError?: (message: string) => void;
}

interface VoskWord {
  conf: number;
  word: string;
}

export function useVoskWordMatch({
  expectedWords,
  commandWords,
  minCommandConfidence,
  onMatch,
  onMismatch,
  onInterim,
  onError,
}: UseVoskWordMatchOptions) {
  const [isListening, setIsListening] = useState(false);
  const [partial, setPartial] = useState('');

  const { model, isReady, isLoading } = useVoskModelContext();

  const recognizerRef = useRef<KaldiRecognizer | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const expectedWordsRef = useRef(expectedWords);
  const commandWordsRef = useRef(commandWords ?? []);
  const minCommandConfidenceRef = useRef(minCommandConfidence ?? 0);
  const onMatchRef = useRef(onMatch);
  const onMismatchRef = useRef(onMismatch);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);

  useEffect(() => { expectedWordsRef.current = expectedWords; }, [expectedWords]);
  useEffect(() => { commandWordsRef.current = commandWords ?? []; }, [commandWords]);
  useEffect(() => { minCommandConfidenceRef.current = minCommandConfidence ?? 0; }, [minCommandConfidence]);
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
  }, []);

  const start = useCallback(async () => {
    if (recognizerRef.current) return;

    if (!isReady || !model) {
      const msg = 'El modelo Vosk de inglés aún no está listo.';
      onErrorRef.current?.(msg);
      return;
    }

    try {
      // 1. Limpieza estricta de palabras en inglés para la gramática de Kaldi
      // Reemplaza caracteres no alfabéticos (ej. "don't" -> "dont") y convierte a minúsculas
      const cleanEnglishWords = expectedWordsRef.current
        .map((w) => w.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim())
        .filter(Boolean);

      let recognizer: KaldiRecognizer;

      // 2. Si tenemos palabras esperadas válidas, se las pasamos en formato JSON
      if (cleanEnglishWords.length > 0) {
        console.log('[Vosk English] Gramática acotada:', cleanEnglishWords);
        recognizer = new model.KaldiRecognizer(SAMPLE_RATE, JSON.stringify(cleanEnglishWords));
      } else {
        console.log('[Vosk English] Sin palabras esperadas, modo abierto.');
        recognizer = new model.KaldiRecognizer(SAMPLE_RATE);
      }

      recognizerRef.current = recognizer;

      recognizer.on('result', (message) => {
        const resultMessage = message as { result: { result?: VoskWord[]; text: string } };
        const heard = resultMessage.result?.text?.trim().toLowerCase() || '';

        // Si la salida es unk o vacía, notificamos la falta de coincidencia
        if (!heard || heard === '[unk]' || heard === '<unk>') {
          onMismatchRef.current?.(heard);
          return;
        }

        const confidence =
          resultMessage.result?.result?.reduce((max, word) => Math.max(max, word.conf ?? 0), 0) ?? 0;

        console.log('[Vosk English] Oído:', heard, '(conf:', confidence.toFixed(2) + ')');

        // Verificamos si la palabra escuchada coincide con alguna de las esperadas
        const match = expectedWordsRef.current.find(
          (w) => w.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim() === heard,
        );

        if (match) {
          const isCommand = commandWordsRef.current.includes(match);
          if (isCommand && confidence < minCommandConfidenceRef.current) {
            onMismatchRef.current?.(heard);
            return;
          }
          onMatchRef.current(match, confidence);
        } else {
          onMismatchRef.current?.(heard);
        }
      });

      recognizer.on('partialresult', (message) => {
        const partialMessage = message as { result: { partial: string } };
        const text = partialMessage.result?.partial || '';
        const clean = text.replace(/\[unk\]|<unk>/g, '').trim();
        setPartial(clean);
        onInterimRef.current?.(clean);
      });

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
        if (recognizerRef.current) {
          recognizerRef.current.acceptWaveform(event.inputBuffer);
        }
      };

      const silence = audioContext.createGain();
      silence.gain.value = 0;

      source.connect(processor);
      processor.connect(silence);
      silence.connect(audioContext.destination);

      setIsListening(true);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error al iniciar Vosk';
      onErrorRef.current?.(errorMsg);
      cleanup();
    }
  }, [isReady, model, cleanup]);

  const stop = useCallback(() => {
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    return () => cleanup();
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