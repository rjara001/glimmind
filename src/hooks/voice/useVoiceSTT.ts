import { useCallback } from 'react';
import { useSpeechSynthesis } from './tts/useSpeechSynthesis';
import { useSpeechRecognition } from './stt/useSpeechRecognition';
import { resolveVoiceLanguages } from '../../services/voice/languages';
import { AssociationList } from '../../types';

export interface UseVoiceSTTOptions {
  list: AssociationList;
  onInterim: (text: string) => void;
  onFinal: (text: string) => void;
  onError: (message: string) => void;
  onAudioChunk?: (blob: Blob) => void;
}

export interface UseVoiceSTTResult {
  tts: ReturnType<typeof useSpeechSynthesis>;
  stt: ReturnType<typeof useSpeechRecognition>;
  languages: ReturnType<typeof resolveVoiceLanguages>;
  stop: () => void;
  start: (lang: string) => void;
  abort: () => void;
}

export function useVoiceSTT({ list, onInterim, onFinal, onError, onAudioChunk }: UseVoiceSTTOptions): UseVoiceSTTResult {
  const tts = useSpeechSynthesis(list.settings.ttsProvider || 'browser');
  const languages = resolveVoiceLanguages(list.concept, list.settings.flipOrder, {
    termLang: list.settings.voiceTermLang,
    defLang: list.settings.voiceDefLang,
  });

  const stt = useSpeechRecognition({
    provider: list.settings.sttProvider || 'browser',
    onInterim: (text) => {
      onInterim(text);
    },
    onFinal: (text) => {
      onFinal(text);
    },
    onError: (message) => {
      onError(message);
    },
    onAudioChunk,
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
