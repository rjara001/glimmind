import { useSTT } from './useSTT';
import { SttProviderType } from '../../../types';

export interface UseSpeechRecognitionOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  provider?: SttProviderType;
  expectedWords?: string[];
  onAudioChunk?: (blob: Blob) => void;
}

export function useSpeechRecognition({
  provider = 'browser',
  expectedWords,
  onFinal,
  onInterim,
  onError,
  onAudioChunk,
}: UseSpeechRecognitionOptions) {
  return useSTT({
    provider,
    expectedWords,
    onFinal,
    onInterim,
    onError,
    onAudioChunk,
  });
}
