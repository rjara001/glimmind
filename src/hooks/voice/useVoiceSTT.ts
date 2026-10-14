import { useCallback } from 'react';
import { useSpeechSynthesis } from './tts/useSpeechSynthesis';
import { useSpeechRecognition } from './stt/useSpeechRecognition';
import { resolveVoiceLanguages } from '../../services/voice/languages';
import {
  resolveEffectiveSttProvider,
  resolveEffectiveTtsProvider,
} from '../../services/voice/effectiveProviders';
import { useGameStore } from '../../store/gameStore';
import { AssociationList } from '../../types';

export interface UseVoiceSTTOptions {
  list: AssociationList;
  expectedWords?: string[];
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
}

export interface UseVoiceSTTResult {
  tts: ReturnType<typeof useSpeechSynthesis>;
  stt: ReturnType<typeof useSpeechRecognition>;
  languages: ReturnType<typeof resolveVoiceLanguages>;
  stop: () => void;
  start: (lang: string) => void;
  abort: () => void;
}

export function useVoiceSTT({ list, expectedWords, onInterim, onFinal, onError }: UseVoiceSTTOptions): UseVoiceSTTResult {
  const tier = useGameStore((state) => state.quota?.tier);
  const tts = useSpeechSynthesis(
    resolveEffectiveTtsProvider(list.settings.ttsProvider, tier)
  );
  const languages = resolveVoiceLanguages(list.concept, list.settings.flipOrder, {
    termLang: list.settings.voiceTermLang,
    defLang: list.settings.voiceDefLang,
  });

  const stt = useSpeechRecognition({
    provider: resolveEffectiveSttProvider(list.settings.sttProvider, tier),
    expectedWords,
    onInterim: (text) => {
      onInterim(text);
    },
    onFinal: (text) => {
      onFinal(text);
    },
    onError: (message) => {
      onError(message);
    },
  });

  const stop = useCallback(() => {
    stt.stop();
  }, [stt]);

  const start = useCallback((lang: string) => {
    stt.start(lang);
  }, [stt]);

  const abort = useCallback(() => {
    stt.abort();
  }, [stt]);

  return {
    tts,
    stt,
    languages,
    stop,
    start,
    abort,
  };
}
