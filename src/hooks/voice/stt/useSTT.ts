import { useBrowserSTT } from './useBrowserSTT';
import { useChipTTSTT } from './useChipTTSTT';
import { useVoskSTT } from './useVoskSTT';
import { SttProvider } from '../../../types/stt';
import { SttProviderType } from '../../../types';

export interface UseSTTOptions {
  provider: SttProviderType;
  expectedWords?: string[];
  commandWords?: string[];
  minCommandConfidence?: number;
  onFinal: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (message: string) => void;
}

export function useSTT({ provider, expectedWords, commandWords, minCommandConfidence, onFinal, onInterim, onError }: UseSTTOptions): SttProvider {
  const browser = useBrowserSTT({ onFinal, onInterim, onError });
  const chiptt = useChipTTSTT({ onFinal, onInterim, onError });
  const vosk = useVoskSTT({
    expectedWords: expectedWords ?? [],
    commandWords,
    minCommandConfidence,
    onFinal,
    onInterim,
    onError,
  });

  if (provider === 'chiptt') {
    return {
      ...chiptt,
      transcribeExistingAudio: chiptt.transcribeExistingAudio,
    };
  }

  if (provider === 'vosk') {
    return vosk;
  }

  return browser;
}
