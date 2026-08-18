import { useSTT } from './useSTT';
import { SttProviderType } from '../../types';

export interface UseSpeechRecognitionOptions {
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  provider?: SttProviderType;
}

export function useSpeechRecognition({
  provider = 'browser',
  onFinal,
  onInterim,
  onError,
}: UseSpeechRecognitionOptions) {
  return useSTT({
    provider,
    onFinal,
    onInterim,
    onError,
  });
}
