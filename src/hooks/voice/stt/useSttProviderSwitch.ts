import { useCallback, useMemo, useRef, useState } from 'react';
import { useBrowserSTT } from './useBrowserSTT';
import { useChipTTSTT } from './useChipTTSTT_streaming';
import { useVoskWordMatch } from './useVoskWordMatch';
import {
  SttProviderId,
  SttTestResult,
  UseSttProviderSwitchOptions,
  SttProviderSwitchState,
} from '../../../types/stt';

function normalizeMatch(expected: string[], heard: string): boolean {
  const h = heard.trim().toLowerCase();
  return expected.some((w) => w.toLowerCase() === h);
}

export function useSttProviderSwitch({
  activeProvider,
  expectedWords,
  onResult,
}: UseSttProviderSwitchOptions): SttProviderSwitchState {
  const [results, setResults] = useState<SttTestResult[]>([]);
  const startTimeRef = useRef<number>(0);
  const expectedRef = useRef(expectedWords);
  expectedRef.current = expectedWords;

  const recordResult = useCallback(
    (provider: SttProviderId, heard: string) => {
      const latencyMs = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
      const matched = normalizeMatch(expectedRef.current, heard);
      const result: SttTestResult = {
        provider,
        expected: expectedRef.current.join('|'),
        heard,
        matched,
        latencyMs,
        timestamp: Date.now(),
      };
      setResults((prev) => [...prev, result]);
      onResult?.(result);
    },
    [onResult],
  );

  const browser = useBrowserSTT({
    onFinal: (transcript) => recordResult('browser', transcript),
    onError: () => {},
  });

  const googleStreaming = useChipTTSTT({
    onFinal: (transcript) => recordResult('google-streaming', transcript),
    onError: () => {},
  });

  const vosk = useVoskWordMatch({
    expectedWords,
    onMatch: (word) => recordResult('vosk', word),
    onMismatch: (heard) => recordResult('vosk', heard),
    onError: () => {},
  });

  const start = useCallback(() => {
    startTimeRef.current = Date.now();
    if (activeProvider === 'browser') browser.start(null);
    if (activeProvider === 'google-streaming') googleStreaming.start(null);
    if (activeProvider === 'vosk') void vosk.start();
  }, [activeProvider, browser, googleStreaming, vosk]);

  const stop = useCallback(() => {
    if (activeProvider === 'browser') browser.stop();
    if (activeProvider === 'google-streaming') googleStreaming.stop();
    if (activeProvider === 'vosk') vosk.stop();
  }, [activeProvider, browser, googleStreaming, vosk]);

  const { isListening, isReady, partial } = useMemo(() => {
    switch (activeProvider) {
      case 'browser':
        return {
          isListening: browser.isListening,
          isReady: browser.supported,
          partial: browser.interimTranscript,
        };
      case 'google-streaming':
        return {
          isListening: googleStreaming.isListening,
          isReady: googleStreaming.supported,
          partial: googleStreaming.interimTranscript,
        };
      case 'vosk':
        return {
          isListening: vosk.isListening,
          isReady: !vosk.isModelLoading,
          partial: vosk.partial,
        };
      default:
        return { isListening: false, isReady: false, partial: '' };
    }
  }, [activeProvider, browser, googleStreaming, vosk]);

  return { activeProvider, isListening, isReady, partial, start, stop, results };
}
