import { useSTT } from './useSTT';
import { SttProviderType } from '../../../types';

export interface UseSpeechRecognitionOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  provider?: SttProviderType;
  onAudioChunk?: (blob: Blob) => void;
}

export function useSpeechRecognition({
  provider = 'browser',
  onFinal,
  onInterim,
  onError,
  onAudioChunk,
}: UseSpeechRecognitionOptions) {
  return useSTT({
    provider,
    onFinal,
    onInterim,
    onError,
    onAudioChunk,
  });
}
