import { useCallback, useState } from 'react';
import { useVoskWordMatch } from './useVoskWordMatch';
import { SttProvider } from '../../../types/stt';

export interface UseVoskSTTOptions {
  expectedWords: string[];
  commandWords?: string[];
  minCommandConfidence?: number;
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
}

export function useVoskSTT({
  expectedWords,
  commandWords,
  minCommandConfidence,
  onFinal,
  onInterim,
  onError,
}: UseVoskSTTOptions): SttProvider {
  const [interimTranscript, setInterimTranscript] = useState('');

  const vosk = useVoskWordMatch({
    expectedWords,
    commandWords,
    minCommandConfidence,
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

  const start = useCallback((_language: string | null) => {
    setInterimTranscript('');
    void vosk.start();
  }, [vosk]);

  const stop = useCallback(() => {
    vosk.stop();
  }, [vosk]);

  const abort = useCallback(() => {
    vosk.stop();
  }, [vosk]);

  return {
    supported: true,
    isListening: vosk.isListening,
    isProcessing: vosk.isModelLoading || vosk.isListening,
    interimTranscript,
    recordingTimeLeft: 0,
    recordingElapsed: 0,
    maxRecordingSeconds: 60,
    start,
    stop,
    abort,
  };
}
