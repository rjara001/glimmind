import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SttProvider } from '../types';
import { useChipttSTT } from './useChipttSTT';

interface RecognitionAlternative {
  transcript: string;
  confidence?: number;
}

interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}

interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: RecognitionEvent) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}

interface WindowWithSpeech extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

const RESTART_DELAY_MS = 150;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as WindowWithSpeech;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export interface UseSpeechRecognitionOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  provider?: SttProvider;
}

export function useSpeechRecognition({
  onFinal,
  onInterim,
  onError,
  provider = 'browser',
}: UseSpeechRecognitionOptions) {
  const chipttStt = useChipttSTT({ onFinal, onInterim, onError });

  const supported = getRecognitionConstructor() !== null;
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRunRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const langRef = useRef<string | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    onInterimRef.current = onInterim;
  }, [onInterim]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const ensureInstance = useCallback(
    (lang: string | null): SpeechRecognitionLike | null => {
      const existing = recognitionRef.current;
      if (existing && lang === langRef.current) return existing;

      const Constructor = getRecognitionConstructor();
      if (!Constructor) return null;

      clearRestartTimer();
      if (existing) {
        shouldRunRef.current = false;
        try {
          existing.abort();
        } catch {
          // Ignore abort errors
        }
      }

      const instance = new Constructor();
      recognitionRef.current = instance;
      langRef.current = lang;
      instance.continuous = true;
      instance.interimResults = true;
      instance.maxAlternatives = 1;
      if (lang) instance.lang = lang;

      instance.onstart = () => {
        setIsListening(true);
      };

      instance.onerror = (event) => {
        const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'];
        if (fatal.includes(event.error)) {
          shouldRunRef.current = false;
          if (event.error === 'not-allowed') {
            onErrorRef.current?.('Microphone permission denied.');
          } else if (event.error === 'service-not-allowed') {
            onErrorRef.current?.('Speech recognition service not allowed.');
          } else if (event.error === 'audio-capture') {
            onErrorRef.current?.('No microphone input detected.');
          }
          return;
        }
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'aborted') return;
        if (event.error === 'network') {
          onErrorRef.current?.('Speech recognition network error.');
        } else {
          onErrorRef.current?.(`Speech recognition error: ${event.error}`);
        }
      };

      instance.onend = () => {
        const wasIntentionalStop = intentionalStopRef.current;
        intentionalStopRef.current = false;
        console.log('[STT] onend shouldRun=' + shouldRunRef.current + ' intentionalStop=' + wasIntentionalStop);
        if (!shouldRunRef.current || wasIntentionalStop || recognitionRef.current !== instance) {
          setIsListening(false);
          return;
        }
        console.log('[STT] auto restart scheduled');
        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (!shouldRunRef.current || recognitionRef.current !== instance) return;
          try {
            instance.start();
          } catch {
            // Instance may already be running
          }
        }, RESTART_DELAY_MS);
      };

      instance.onresult = (event) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const alternative = result && result[0];
          const transcript = alternative?.transcript ?? '';
          if (result.isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        if (interim) {
          onInterimRef.current?.(interim);
        }
        console.log('[STT] interim="' + interim + '"');
        setInterimTranscript(interim);
        if (final) {
          const trimmed = final.trim();
          console.log('[STT] final="' + trimmed + '"');
          onFinalRef.current(trimmed);
        }
      };

      return instance;
    },
    [clearRestartTimer],
  );

  const start = useCallback(
    (lang: string | null) => {
      if (provider === 'chiptt') {
        chipttStt.start(lang);
        return;
      }

      const instance = ensureInstance(lang);
      if (!instance) return;
      shouldRunRef.current = true;
      setInterimTranscript('');
      try {
        instance.start();
      } catch {
        // Instance may already be running
      }
    },
    [provider, chipttStt.start, ensureInstance],
  );

  const stop = useCallback(() => {
    if (provider === 'chiptt') {
      chipttStt.stop();
      return;
    }

    console.log('[STT] stop reason=intentional');
    intentionalStopRef.current = true;
    shouldRunRef.current = false;
    clearRestartTimer();
    setIsListening(false);
    try {
      recognitionRef.current?.stop();
    } catch {
      // Instance may not be running
    }
  }, [provider, chipttStt.stop, clearRestartTimer]);

  const abort = useCallback(() => {
    if (provider === 'chiptt') {
      chipttStt.abort();
      return;
    }

    console.log('[STT] stop reason=abort');
    intentionalStopRef.current = true;
    shouldRunRef.current = false;
    clearRestartTimer();
    setIsListening(false);
    try {
      recognitionRef.current?.abort();
    } catch {
      // Instance may not be running
    }
  }, [provider, chipttStt.abort, clearRestartTimer]);

  useEffect(() => {
    return () => {
      shouldRunRef.current = false;
      intentionalStopRef.current = true;
      clearRestartTimer();
      try {
        recognitionRef.current?.abort();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [clearRestartTimer]);

  return useMemo(
    () => ({
      supported,
      isListening,
      interimTranscript,
      start,
      stop,
      abort,
    }),
    [supported, isListening, interimTranscript, start, stop, abort],
  );
}
