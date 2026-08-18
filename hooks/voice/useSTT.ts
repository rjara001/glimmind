import { useBrowserSTT } from './stt/useBrowserSTT';
import { useChipTTSTT } from './stt/useChipTTSTT';
import { SttProvider } from '../../types/stt';
import { SttProviderType } from '../../types';

export interface UseSTTOptions {
  provider: SttProviderType;
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
}

export function useSTT({ provider, onFinal, onInterim, onError }: UseSTTOptions): SttProvider {
  const browser = useBrowserSTT({ onFinal, onInterim, onError });
  const chiptt = useChipTTSTT({ onFinal, onInterim, onError });

  return provider === 'chiptt' ? chiptt : browser;
}
