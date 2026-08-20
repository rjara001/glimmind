import React, { useState, useEffect, useCallback } from 'react';
import { useVoskModelContext } from '../../context/VoskModelContext';
import { VoiceLanguage } from '../../types';
import { SettingsModalProps } from '../../types/settings-modal-props';
import {
  isChirpVoiceId,
} from '../../services/voice/tts/chirpVoices';
import { GameModeSection } from './settings/GameModeSection';
import { VoiceSection } from './settings/VoiceSection';
import { VoiceCommandsSection } from './settings/VoiceCommandsSection';
import { AnswerValidationSection } from './settings/AnswerValidationSection';
import { ToggleSection } from './settings/ToggleSection';

function normalizeVoiceSettings(
  settings: Record<string, unknown>
): Record<string, unknown> {
  const normalized = { ...settings };

  if (normalized.ttsProvider === 'chirp') {
    if (!isChirpVoiceId(normalized.voiceTermId as string)) {
      normalized.voiceTermId = undefined;
    }

    if (!isChirpVoiceId(normalized.voiceDefId as string)) {
      normalized.voiceDefId = undefined;
    }
  }

  return normalized;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  list,
  onUpdateList,
  onClose,
}) => {
  const [draft, setDraft] = useState(
    normalizeVoiceSettings(list.settings as Record<string, unknown>)
  );

  const [voices, setVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);
  const { isReady: isVoskReady } = useVoskModelContext();

  useEffect(() => {
    const load = () => {
      setVoices(
        typeof window !== 'undefined' &&
          'speechSynthesis' in window
          ? window.speechSynthesis.getVoices()
          : []
      );
    };

    load();

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window
    ) {
      window.speechSynthesis.addEventListener(
        'voiceschanged',
        load
      );

      return () =>
        window.speechSynthesis.removeEventListener(
          'voiceschanged',
          load
        );
    }
  }, []);

  const handleAccept = () => {
    const finalSettings =
      normalizeVoiceSettings(draft);

    const updated = {
      ...list,
      settings: finalSettings as Record<string, unknown> as typeof list.settings,
    };
    onUpdateList(updated);
    onClose();
  };

  const playTestVoice = useCallback(
    async (
      lang: VoiceLanguage | string | undefined,
      voiceId?: string
    ) => {
      if (
        typeof window === 'undefined' ||
        !('speechSynthesis' in window)
      )
        return;

      const text =
        lang?.startsWith('es')
          ? 'Hola, soy Glimmind'
          : lang?.startsWith('en')
            ? 'Hello, I am Glimmind'
            : lang?.startsWith('fr')
              ? 'Bonjour, je suis Glimmind'
              : lang?.startsWith('de')
                ? 'Hallo, ich bin Glimmind'
                : lang?.startsWith('it')
                  ? 'Ciao, sono Glimmind'
                  : lang?.startsWith('pt')
                    ? 'Olá, eu sou Glimmind'
                    : 'Hello, I am Glimmind';

      const rate = (draft.voiceRate as number) ?? 1;
      const pitch = (draft.voicePitch as number) ?? 1;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = (lang as string) || 'es';
      utterance.rate = rate;
      utterance.pitch = pitch;
      if (voiceId) {
        const voice = voices.find((v) => v.voiceURI === voiceId);
        if (voice) utterance.voice = voice;
      }
      window.speechSynthesis.speak(utterance);
    },
    [draft.voiceRate, draft.voicePitch, voices]
  );

  const isReversed =
    draft.flipOrder === 'reversed';
  const isPracticeMode =
    draft.mode === 'training';
  const isShowingHints =
    draft.showHints !== false;
  const isVoiceEnabled =
    draft.voiceEnabled === true;
  const ttsProvider: string =
    (draft.ttsProvider as string) || 'browser';
  const sttProvider: string =
    (draft.sttProvider as string) || 'browser';
  const isIgnoringArticles =
    draft.ignoreArticles === true;

  const conceptParts =
    list.concept.split('/');
  const termLabel =
    conceptParts[0] || 'Término';
  const defLabel =
    conceptParts[1] || 'Definición';

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div
        className="bg-white w-full max-w-sm rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-white"
        style={{
          scrollbarWidth: 'none',
        }}
      >
        <h3 className="text-3xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tighter text-center">
          Settings
        </h3>

        <div className="space-y-4 mb-8">
          <GameModeSection
            isPracticeMode={isPracticeMode}
            onModeChange={(mode: 'training' | 'real') =>
              setDraft({ ...draft, mode })
            }
          />

          <ToggleSection
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                />
              </svg>
            }
            label="Flip Cards"
            isActive={isReversed}
            onToggle={() =>
              setDraft({
                ...draft,
                flipOrder: isReversed
                  ? 'normal'
                  : 'reversed',
              })
            }
          />

          <ToggleSection
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            }
            label="Hints"
            isActive={isShowingHints}
            onToggle={() =>
              setDraft({
                ...draft,
                showHints: !isShowingHints,
              })
            }
          />

          <VoiceSection
            isVoiceEnabled={isVoiceEnabled}
            onVoiceEnabledToggle={() =>
              setDraft({
                ...draft,
                voiceEnabled: !isVoiceEnabled,
              })
            }
            ttsProvider={ttsProvider}
            onTtsProviderChange={(provider: string) =>
              setDraft({
                ...draft,
                ttsProvider: provider,
              })
            }
            sttProvider={sttProvider}
            onSttProviderChange={(provider: string) =>
              setDraft({
                ...draft,
                sttProvider: provider,
              })
            }
            isVoskReady={isVoskReady}
            draft={draft}
            onDraftChange={setDraft}
            voices={voices}
            termLabel={termLabel}
            defLabel={defLabel}
            onPlayTestVoice={playTestVoice}
          />

          <VoiceCommandsSection
            draft={draft}
            onDraftChange={setDraft}
          />
        </div>

        <AnswerValidationSection
          isIgnoringArticles={isIgnoringArticles}
          onIgnoreArticlesToggle={() =>
            setDraft({
              ...draft,
              ignoreArticles: !isIgnoringArticles,
            })
          }
          threshold={draft.threshold as number}
          onThresholdChange={(threshold: number) =>
            setDraft({ ...draft, threshold })
          }
        />

        <div className="flex flex-col gap-3">
          <button
            onClick={handleAccept}
            className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-indigo-200"
          >
            Accept & Close
          </button>

          <button
            onClick={onClose}
            className="w-full bg-slate-100 text-slate-500 py-3 rounded-[1.5rem] font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition active:scale-95"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
