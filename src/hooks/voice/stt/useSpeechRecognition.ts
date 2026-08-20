import { useSTT } from './useSTT';
import { SttProviderType } from '../../../types';

export interface UseSpeechRecognitionOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  provider?: SttProviderType;
  expectedWords?: string[];
  commandWords?: string[];
  minCommandConfidence?: number;
  onAudioChunk?: (blob: Blob) => void;
}

export function useSpeechRecognition({
  provider = 'browser',
  expectedWords,
  commandWords,
  minCommandConfidence,
  onFinal,
  onInterim,
  onError,
  onAudioChunk,
}: UseSpeechRecognitionOptions) {
  return useSTT({
    provider,
    expectedWords,
    commandWords,
    minCommandConfidence,
    onFinal,
    onInterim,
    onError,
    onAudioChunk,
  });
}
