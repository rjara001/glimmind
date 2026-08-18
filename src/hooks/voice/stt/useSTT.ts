import { useBrowserSTT } from './useBrowserSTT';
import { useChipTTSTT } from './useChipTTSTT';
import { SttProvider } from '../../../types/stt';
import { SttProviderType } from '../../../types';

export interface UseSTTOptions {
  provider: SttProviderType;
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
  onAudioChunk?: (blob: Blob) => void;
}

export function useSTT({ provider, onFinal, onInterim, onError, onAudioChunk }: UseSTTOptions): SttProvider {
  const browser = useBrowserSTT({ onFinal, onInterim, onError, onAudioChunk });
  const chiptt = useChipTTSTT({ onFinal, onInterim, onError });

  if (provider === 'chiptt') {
    return {
      ...chiptt,
      transcribeExistingAudio: chiptt.transcribeExistingAudio,
    };
  }

  return browser;
}
