import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useVoskModelContext } from '../../context/VoskModelContext';
import { VoiceLanguage } from '../../types';
import { SettingsModalProps } from '../../types/settings-modal-props';
import { ListSettings } from '../../types';
import type { UserTier } from '../../types/quota';
import { isChirpVoiceId } from '../../services/voice/tts/chirpVoices';
import { useGameStore } from '../../store/gameStore';
import {
  resolveEffectiveSttProvider,
  resolveEffectiveTtsProvider,
} from '../../services/voice/effectiveProviders';

import { logEvent } from '../../services/errorReporting';
  import { GameModeSection } from './settings/GameModeSection';
  import { VoiceSection } from './settings/VoiceSection';
  import { VoiceCommandsSection } from './settings/VoiceCommandsSection';
  import { AnswerValidationSection } from './settings/AnswerValidationSection';
  import { ToggleSection } from './settings/ToggleSection';

  // Extrae metadatos específicos del entorno para diagnóstico en Mobile
  const getMobileContext = () => {
    if (typeof window === 'undefined') return {};
    return {
      userAgent: navigator.userAgent,
      isTouchDevice: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      hasSpeechSynthesis: 'speechSynthesis' in window,
    };
  };

  export function normalizeVoiceSettings(
    settings: ListSettings,
    tier: UserTier | null | undefined
  ): ListSettings {
    const normalized = { ...settings };

    // Rule 0: a free account can never store a cloud voice provider.
    const ttsProvider = resolveEffectiveTtsProvider(normalized.ttsProvider, tier);
    if (normalized.ttsProvider && ttsProvider !== normalized.ttsProvider) {
      normalized.ttsProvider = ttsProvider;
    }
    const sttProvider = resolveEffectiveSttProvider(normalized.sttProvider, tier);
    if (normalized.sttProvider && sttProvider !== normalized.sttProvider) {
      normalized.sttProvider = sttProvider;
    }

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
    const { t } = useTranslation();
    const tier = useGameStore((state) => state.quota?.tier);
    const [draft, setDraft] = useState(() =>
      normalizeVoiceSettings(list.settings || ({} as ListSettings), tier)
    );
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { isReady: isVoskReady, load: loadVoskModel } = useVoskModelContext();

    useEffect(() => {
      // 1. Log de apertura del modal
      logEvent('settings.modal_opened', {
        message: t('settings.settings_modal_opened'),
        extra: {
          listId: list.id,
          mobileContext: getMobileContext(),
        },
      }).catch(() => {});

      const load = () => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          setVoices(window.speechSynthesis.getVoices());
        }
      };

      load();

      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.addEventListener('voiceschanged', load);
        return () => {
          window.speechSynthesis.removeEventListener('voiceschanged', load);
        };
      }
    }, [list.id, t]);

  // Dentro de SettingsModal:
  const handleAccept = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const finalSettings = normalizeVoiceSettings(draft, tier);

      const updatedList = {
        ...list,
        settings: finalSettings,
      };

      await onUpdateList(updatedList);

      await logEvent('settings.flow_completed', {
        message: t('settings.settings_flow_finished_successfully'),
      });

      onClose();
    } catch (error: any) {
      const isHandledBackendError = error && 
        typeof error === 'object' &&
        (error.message?.includes('500') || error.message?.includes('Internal Server Error'));
      
      if (!isHandledBackendError) {
        await logEvent('settings.flow_failed', {
          message: t('settings.flow_failed', {
            error: error?.message || String(error),
          }),
          error,
        });
      } else {
        await logEvent('settings.flow_completed', {
          message: t('settings.settings_flow_finished_successfully_local_'),
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };
    const handleClose = () => {
      logEvent('settings.modal_cancelled', {
        message: t('settings.user_closed_modal_without_saving'),
        extra: { listId: list.id },
      }).catch(() => {});
      onClose();
    };

    const playTestVoice = useCallback(
      async (lang: VoiceLanguage | string | undefined, voiceId?: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
          await logEvent('settings.tts_unavailable', {
            message: t('settings.speechsynthesis_not_available_in_this_mobi'),
            extra: { mobileContext: getMobileContext() },
          });
          return;
        }

        const text = lang?.startsWith('es')
          ? t('settings.hola_soy_glimmind')
          : t('settings.hello_i_am_glimmind');

        const rate = (draft.voiceRate as number) ?? 1;
        const pitch = (draft.voicePitch as number) ?? 1;

        try {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = (lang as string) || 'es';
          utterance.rate = rate;
          utterance.pitch = pitch;

          if (voiceId) {
            const voice = voices.find((v) => v.voiceURI === voiceId);
            if (voice) utterance.voice = voice;
          }

          window.speechSynthesis.speak(utterance);
        } catch (err) {
          await logEvent('settings.tts_error', {
            message: err instanceof Error ? err.message : t('settings.tts_error'),
            error: err,
            extra: {
              context: 'playTestVoice',
              mobileContext: getMobileContext(),
            },
          });
        }
      },
      [draft.voiceRate, draft.voicePitch, voices, t]
    );

    const isReversed = draft.flipOrder === 'reversed';
    const isPracticeMode = draft.mode === 'training';
    const isShowingHints = draft.showHints !== false;
    const isVoiceEnabled = draft.voiceEnabled === true;
    const ttsProvider: string = (draft.ttsProvider as string) || 'browser';
    const sttProvider: string = (draft.sttProvider as string) || 'browser';
    const isIgnoringArticles = draft.ignoreArticles === true;

    const conceptParts = list.concept.split('/');
    const termLabel = conceptParts[0] || t('settings.termino');
    const defLabel = conceptParts[1] || t('settings.definicion');

    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
        <div
          className="bg-white w-full max-w-sm rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-white"
          style={{ scrollbarWidth: 'none' }}
        >
          <h3 className="text-3xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tighter text-center">
            {t('settings.settings')}
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
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              }
              label="Flip Cards"
              isActive={isReversed}
              onToggle={() =>
                setDraft({
                  ...draft,
                  flipOrder: isReversed ? 'normal' : 'reversed',
                })
              }
            />

            <ToggleSection
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
              isPremium={tier === 'premium'}
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
                  ttsProvider: provider as ListSettings['ttsProvider'],
                })
              }
              sttProvider={sttProvider}
              onSttProviderChange={(provider: string) => {
                setDraft({
                  ...draft,
                  sttProvider: provider as ListSettings['sttProvider'],
                });
                // The Vosk model is 41 MB, so it only downloads once the user opts in.
                if (provider === 'vosk') void loadVoskModel();
              }}
              isVoskReady={isVoskReady}
              draft={draft as unknown as Record<string, unknown>}
              onDraftChange={setDraft as unknown as (draft: Record<string, unknown>) => void}
              voices={voices}
              termLabel={termLabel}
              defLabel={defLabel}
              onPlayTestVoice={playTestVoice}
            />

            <VoiceCommandsSection draft={draft as unknown as Record<string, unknown>} onDraftChange={setDraft as unknown as (draft: Record<string, unknown>) => void} />
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
              disabled={isSubmitting}
              className="w-full bg-indigo-600 text-white py-5 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest hover:bg-indigo-700 transition active:scale-95 shadow-xl shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : t('settings.accept_close')}
            </button>

            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-full bg-slate-100 text-slate-500 py-3 rounded-[1.5rem] font-bold uppercase text-[10px] tracking-widest hover:bg-slate-200 transition active:scale-95 disabled:opacity-50"
            >
              {t('settings.cancel')}
            </button>
          </div>
        </div>
      </div>
    );
  };