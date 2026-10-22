import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SttProvider } from '../../../types/stt';

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
const START_TIMEOUT_MS = 4000;
const INACTIVITY_TIMEOUT_MS = 10000;
// Silence needed before an utterance is considered complete. Mobile engines
// emit each word as its own isFinal result with ~200-600 ms gaps; 1200 ms is
// above inter-word gaps and below a deliberate phrase boundary (U-05).
const SILENCE_FLUSH_MS = 1200;
// Hard cap: never hold an utterance longer than this even if finals keep
// arriving (continuous dictation must still reach the consumer).
const MAX_UTTERANCE_MS = 3000;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const speechWindow = window as unknown as WindowWithSpeech;
  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null;
}

export interface UseBrowserSTTOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
}

export function useBrowserSTT({
  onFinal,
  onInterim,
  onError,
}: UseBrowserSTTOptions): SttProvider {
  const supported = getRecognitionConstructor() !== null;
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const shouldRunRef = useRef(false);
  const intentionalStopRef = useRef(false);
  const langRef = useRef<string | null>(null);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Safety watchdogs: mobile browsers may never fire onstart/onend when the
  // engine dies silently, so every session must have a guaranteed reset path.
  const startTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingStartRef = useRef(false);

  const accumulatedFinalRef = useRef<string>('');
  const finalDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxUtteranceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utteranceStartRef = useRef<number>(0);
  // Cursor into the session-scoped results array: everything below it was
  // already flushed via onFinal; rebuilds only read the unflushed suffix.
  const flushCursorRef = useRef<number>(0);
  const resultsLengthRef = useRef<number>(0);

  // Ref sync for callbacks and dynamic data
  const onFinalRef = useRef(onFinal);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);

  useEffect(() => { onFinalRef.current = onFinal; }, [onFinal]);
  useEffect(() => { onInterimRef.current = onInterim; }, [onInterim]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const clearSafetyTimers = useCallback(() => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
      startTimerRef.current = null;
    }
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
      inactivityTimerRef.current = null;
    }
    pendingStartRef.current = false;
  }, []);

  const clearFinalBuffer = useCallback(() => {
    accumulatedFinalRef.current = '';
    utteranceStartRef.current = 0;
    flushCursorRef.current = 0;
    resultsLengthRef.current = 0;
    if (finalDebounceRef.current) {
      clearTimeout(finalDebounceRef.current);
      finalDebounceRef.current = null;
    }
    if (maxUtteranceTimerRef.current) {
      clearTimeout(maxUtteranceTimerRef.current);
      maxUtteranceTimerRef.current = null;
    }
  }, []);

  const flushAccumulatedFinal = useCallback(() => {
    if (finalDebounceRef.current) {
      clearTimeout(finalDebounceRef.current);
      finalDebounceRef.current = null;
    }
    if (maxUtteranceTimerRef.current) {
      clearTimeout(maxUtteranceTimerRef.current);
      maxUtteranceTimerRef.current = null;
    }
    const accumulated = accumulatedFinalRef.current;
    accumulatedFinalRef.current = '';
    utteranceStartRef.current = 0;
    flushCursorRef.current = resultsLengthRef.current;
    if (accumulated.trim()) {
      onFinalRef.current(accumulated.trim());
    }
  }, []);

  const armStartWatchdog = useCallback((instance: SpeechRecognitionLike) => {
    if (startTimerRef.current) {
      clearTimeout(startTimerRef.current);
    }
    startTimerRef.current = setTimeout(() => {
      startTimerRef.current = null;
      if (!pendingStartRef.current) return;
      if (!shouldRunRef.current || recognitionRef.current !== instance) return;
      pendingStartRef.current = false;
      setIsListening(false);
      setInterimTranscript('');
      clearFinalBuffer();
      try {
        instance.abort();
      } catch {
        // ignore abort errors
      }
      onErrorRef.current?.('Speech recognition did not start. Check microphone availability.');
    }, START_TIMEOUT_MS);
  }, [clearFinalBuffer]);

  const armInactivityWatchdog = useCallback((instance: SpeechRecognitionLike) => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    inactivityTimerRef.current = setTimeout(() => {
      inactivityTimerRef.current = null;
      if (!shouldRunRef.current || recognitionRef.current !== instance) return;
      console.warn('[BrowserSTT] Inactivity timeout reached; restarting recognition.');
      try {
        instance.abort();
      } catch {
        // ignore abort errors
      }
      // Force a restart in case onend never fires after the abort.
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        if (!shouldRunRef.current || recognitionRef.current !== instance) return;
        // The results array resets on start(); drop any stale cursor.
        clearFinalBuffer();
        try {
          instance.start();
          pendingStartRef.current = true;
          armStartWatchdog(instance);
          armInactivityWatchdog(instance);
        } catch {
          // Instance may already be running
        }
      }, RESTART_DELAY_MS + 300);
    }, INACTIVITY_TIMEOUT_MS);
  }, [armStartWatchdog, clearFinalBuffer]);

  const ensureInstance = useCallback(
    (lang: string | null): SpeechRecognitionLike | null => {
      const existing = recognitionRef.current;
      if (existing && lang === langRef.current) return existing;

      const Constructor = getRecognitionConstructor();
      if (!Constructor) return null;

      clearRestartTimer();
      clearSafetyTimers();
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
        pendingStartRef.current = false;
        if (startTimerRef.current) {
          clearTimeout(startTimerRef.current);
          startTimerRef.current = null;
        }
        setIsListening(true);
        armInactivityWatchdog(instance);
      };

      instance.onerror = (event) => {
        const fatal = ['not-allowed', 'service-not-allowed', 'audio-capture'];
        if (fatal.includes(event.error)) {
          shouldRunRef.current = false;
          clearSafetyTimers();
          if (event.error === 'not-allowed') {
            onErrorRef.current?.('Microphone permission denied.');
          } else if (event.error === 'service-not-allowed') {
            onErrorRef.current?.('Speech recognition service not allowed.');
          } else if (event.error === 'audio-capture') {
            onErrorRef.current?.('No microphone input detected.');
          }
          return;
        }
        if (event.error === 'no-speech' || event.error === 'aborted') return;
        if (event.error === 'network') {
          onErrorRef.current?.('Speech recognition network error.');
        } else {
          onErrorRef.current?.(`Speech recognition error: ${event.error}`);
        }
      };

      instance.onend = () => {
        const wasIntentionalStop = intentionalStopRef.current;
        intentionalStopRef.current = false;
        if (!shouldRunRef.current || wasIntentionalStop || recognitionRef.current !== instance) {
          clearSafetyTimers();
          clearFinalBuffer();
          setIsListening(false);
          setInterimTranscript('');
          return;
        }

        // Safety net: emit whatever the debounce has not flushed yet.
        flushAccumulatedFinal();

        restartTimerRef.current = setTimeout(() => {
          restartTimerRef.current = null;
          if (!shouldRunRef.current || recognitionRef.current !== instance) return;
          // The results array resets on start(); drop any stale cursor.
          clearFinalBuffer();
          try {
            instance.start();
            pendingStartRef.current = true;
            armStartWatchdog(instance);
          } catch {
            // Instance may already be running
          }
        }, RESTART_DELAY_MS);
      };

      instance.onresult = (event) => {
        armInactivityWatchdog(instance);
        resultsLengthRef.current = event.results.length;

        let interim = '';
        let final = '';

        // Rebuild from the flush cursor instead of event.resultIndex: mobile
        // engines append each word as its own isFinal result, so the full
        // unflushed phrase can only be reconstructed by re-reading every
        // result the cursor has not emitted yet (U-05).
        for (let i = flushCursorRef.current; i < event.results.length; i += 1) {
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
        setInterimTranscript(interim);

        if (final) {
          accumulatedFinalRef.current = final;

          if (!utteranceStartRef.current) {
            utteranceStartRef.current = Date.now();
            if (maxUtteranceTimerRef.current) {
              clearTimeout(maxUtteranceTimerRef.current);
            }
            maxUtteranceTimerRef.current = setTimeout(() => {
              maxUtteranceTimerRef.current = null;
              flushAccumulatedFinal();
            }, MAX_UTTERANCE_MS);
          }

          if (finalDebounceRef.current) {
            clearTimeout(finalDebounceRef.current);
          }
          finalDebounceRef.current = setTimeout(() => {
            finalDebounceRef.current = null;
            flushAccumulatedFinal();
          }, SILENCE_FLUSH_MS);
        }
      };

      return instance;
    },
    [armInactivityWatchdog, armStartWatchdog, clearRestartTimer, clearSafetyTimers, clearFinalBuffer, flushAccumulatedFinal],
  );

  const start = useCallback(
    (lang: string | null = 'en-US') => {
      const instance = ensureInstance(lang || 'en-US');
      if (!instance) return;
      shouldRunRef.current = true;
      intentionalStopRef.current = false;
      setInterimTranscript('');
      clearFinalBuffer();
      try {
        instance.start();
        pendingStartRef.current = true;
        armStartWatchdog(instance);
      } catch {
        // Instance may already be running
      }
    },
    [armStartWatchdog, ensureInstance, clearFinalBuffer],
  );

  const stop = useCallback(() => {
    intentionalStopRef.current = true;
    shouldRunRef.current = false;
    clearRestartTimer();
    clearSafetyTimers();
    clearFinalBuffer();
    setIsListening(false);
    setInterimTranscript('');
    try {
      recognitionRef.current?.stop();
    } catch {
      // Instance may not be running
    }
  }, [clearRestartTimer, clearSafetyTimers, clearFinalBuffer]);

  const abort = useCallback(() => {
    intentionalStopRef.current = true;
    shouldRunRef.current = false;
    clearRestartTimer();
    clearSafetyTimers();
    clearFinalBuffer();
    setIsListening(false);
    setInterimTranscript('');
    try {
      recognitionRef.current?.abort();
    } catch {
      // Instance may not be running
    }
  }, [clearRestartTimer, clearSafetyTimers, clearFinalBuffer]);

  useEffect(() => {
    return () => {
      const instance = recognitionRef.current;
      shouldRunRef.current = false;
      intentionalStopRef.current = true;
      clearRestartTimer();
      clearSafetyTimers();
      clearFinalBuffer();
      try {
        instance?.abort();
      } catch {
        // Ignore cleanup errors
      }
    };
  }, [clearRestartTimer, clearSafetyTimers, clearFinalBuffer]);

  return useMemo(
    () => ({
      supported,
      isListening,
      isProcessing: false,
      interimTranscript,
      recordingTimeLeft: 0,
      recordingElapsed: 0,
      maxRecordingSeconds: 0,
      start,
      stop,
      abort,
    }),
    [supported, isListening, interimTranscript, start, stop, abort],
  );
}
