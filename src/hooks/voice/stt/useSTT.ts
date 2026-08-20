import { useCallback, useEffect, useRef, useState } from 'react';
import { useBrowserSTT } from './useBrowserSTT';
import { useChipTTSTT } from './useChipTTSTT';
import { useVoskWordMatch } from './useVoskWordMatch';
import { SttProvider } from '../../../types/stt';
import { SttProviderType } from '../../../types';

export interface UseSTTOptions {
  provider: SttProviderType;
  expectedWords?: string[];
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  onAudioChunk?: (blob: Blob) => void;
}

function useVoskSTT({
  expectedWords,
  onFinal,
  onInterim,
  onError,
}: {
  expectedWords: string[];
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
}): SttProvider {
  const [isListening, setIsListening] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const vosk = useVoskWordMatch({
    expectedWords,
    onMatch: (word) => {
      onFinal(word);
    },
    onMismatch: (heard) => {
      onFinal(heard || '');
    },
    onInterim: (text) => {
      setInterimTranscript(text);
      onInterim?.(text);
    },
    onError: (message) => {
      onError?.(message);
    },
  });

  useEffect(() => {
    setIsModelLoading(vosk.isModelLoading);
    setIsListening(vosk.isListening);
  }, [vosk.isModelLoading, vosk.isListening]);

  const start = useCallback((_language: string | null) => {
    startTimeRef.current = Date.now();
    setInterimTranscript('');
    void vosk.start();
  }, [vosk]);

  const stop = useCallback(() => {
    vosk.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [vosk]);

  const abort = useCallback(() => {
    vosk.stop();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [vosk]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  return {
    supported: true,
    isListening,
    isProcessing: isModelLoading || vosk.isListening,
    interimTranscript,
    recordingTimeLeft: 0,
    recordingElapsed: 0,
    maxRecordingSeconds: 60,
    start,
    stop,
    abort,
  };
}

export function useSTT({ provider, expectedWords, onFinal, onInterim, onError, onAudioChunk }: UseSTTOptions): SttProvider {
  const browser = useBrowserSTT({ onFinal, onInterim, onError, onAudioChunk });
  const chiptt = useChipTTSTT({ onFinal, onInterim, onError });
  const vosk = expectedWords ? useVoskSTT({ expectedWords, onFinal, onInterim, onError }) : null;

  if (provider === 'chiptt') {
    return {
      ...chiptt,
      transcribeExistingAudio: chiptt.transcribeExistingAudio,
    };
  }

  if (provider === 'vosk' && vosk) {
    return vosk;
  }

  return browser;
}
