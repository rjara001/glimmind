import React from 'react';
import { useChirpVoices } from '../../../hooks/voice/tts/useChirpVoices';
import {
  isChirpVoiceId,
} from '../../../services/voice/tts/chirpVoices';
import type { VoiceLanguage, ChirpVoice } from '../../../types';
import { ProviderToggle } from './ProviderToggle';
import { SelectField } from './SelectField';
import { RangeSliderField } from './RangeSliderField';

const VOICE_LANGUAGE_OPTIONS: {
  value: VoiceLanguage;
  label: string;
}[] = [
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'en', label: '🇬🇧 Inglés' },
  { value: 'fr', label: '🇫🇷 Francés' },
  { value: 'de', label: '🇩🇪 Alemán' },
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'pt', label: '🇧🇷 Portugués' },
];

function buildVoiceOptions(
  voices: SpeechSynthesisVoice[],
  lang: VoiceLanguage | string | null | undefined
): { id: string; label: string }[] {
  const options: { id: string; label: string }[] = [];
  for (const voice of voices) {
    const match =
      !lang ||
      voice.lang
        .toLowerCase()
        .startsWith(String(lang).toLowerCase());
    if (match || options.length === 0) {
      options.push({
        id: voice.voiceURI,
        label: `${voice.name} (${voice.lang})${
          voice.default ? ' • default' : ''
        }`,
      });
    }
  }
  return options.slice(0, 40);
}

interface VoiceSectionProps {
  isVoiceEnabled: boolean;
  onVoiceEnabledToggle: () => void;
  ttsProvider: string;
  onTtsProviderChange: (provider: string) => void;
  sttProvider: string;
  onSttProviderChange: (provider: string) => void;
  isVoskReady: boolean;
  draft: Record<string, unknown>;
  onDraftChange: (draft: Record<string, unknown>) => void;
  voices: SpeechSynthesisVoice[];
  termLabel: string;
  defLabel: string;
  onPlayTestVoice: (lang: string, voiceId?: string) => void;
}

export const VoiceSection: React.FC<VoiceSectionProps> = ({
  isVoiceEnabled,
  onVoiceEnabledToggle,
  ttsProvider,
  onTtsProviderChange,
  sttProvider,
  onSttProviderChange,
  isVoskReady,
  draft,
  onDraftChange,
  voices,
  termLabel,
  defLabel,
  onPlayTestVoice,
}) => {
  const {
    voices: chirpVoices,
    isLoading: chirpVoicesLoading,
  } = useChirpVoices();

  const updateDraft = (updates: Record<string, unknown>) => {
    onDraftChange({ ...draft, ...updates });
  };

  return (
    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
        Voice
      </p>

      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-bold text-slate-700">Enable voice</p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Pronounce the word and listen to your answer
          </p>
        </div>
        <button
          onClick={onVoiceEnabledToggle}
          className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${
            isVoiceEnabled ? 'bg-indigo-400' : 'bg-slate-200'
          }`}
          aria-label="Toggle voice"
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${
              isVoiceEnabled ? 'left-5' : 'left-1'
            }`}
          />
        </button>
      </div>

      {isVoiceEnabled && (
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              TTS Provider
            </label>
            <ProviderToggle
              value={ttsProvider}
              onChange={onTtsProviderChange}
              options={[
                { value: 'browser', label: 'Browser' },
                { value: 'chirp', label: 'Chirp 3 HD' },
              ]}
            />
            {ttsProvider === 'chirp' && (
              <p className="text-[10px] text-slate-400 mt-1.5">
                Calidad premium · fallback automático a browser si se agota la cuota
              </p>
            )}
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
              STT Provider
            </label>
            <ProviderToggle
              value={sttProvider}
              onChange={onSttProviderChange}
              options={[
                { value: 'browser', label: 'Browser' },
                { value: 'chiptt', label: 'Chiptt' },
                { value: 'vosk', label: 'Vosk' },
              ]}
              disabled={!isVoskReady && sttProvider === 'vosk'}
            />
            {sttProvider === 'chiptt' && (
              <p className="text-[10px] text-slate-400 mt-1.5">
                Calidad premium · requiere grabación de audio
              </p>
            )}
            {sttProvider === 'vosk' && (
              <p className="text-[10px] text-slate-400 mt-1.5">
                {isVoskReady
                  ? 'Reconocimiento offline · requiere conexión solo para descargar el modelo (~41MB)'
                  : 'Requiere conexión a internet para descargar el modelo'}
              </p>
            )}
          </div>

          <SelectField
            label={`Idioma de ${termLabel}`}
            value={(draft.voiceTermLang as string) || 'es'}
            onChange={(value) => updateDraft({ voiceTermLang: value })}
            ariaLabel={`Idioma de ${termLabel}`}
          >
            {VOICE_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>

          <SelectField
            label={`Idioma de ${defLabel}`}
            value={(draft.voiceDefLang as string) || 'es'}
            onChange={(value) => updateDraft({ voiceDefLang: value })}
            ariaLabel={`Idioma de ${defLabel}`}
          >
            {VOICE_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </SelectField>

          <VoiceSelect
            label={`Voz de ${termLabel}`}
            value={(draft.voiceTermId as string) || ''}
            onChange={(value) => updateDraft({ voiceTermId: value || undefined })}
            ttsProvider={ttsProvider}
            voices={voices}
            chirpVoices={chirpVoices}
            chirpVoicesLoading={chirpVoicesLoading}
            lang={draft.voiceTermLang as string}
            onTest={() => {
              const lang = (draft.voiceTermLang as string) || 'es';
              let voiceId = draft.voiceTermId as string | undefined;
              if (ttsProvider === 'chirp' && (!voiceId || !isChirpVoiceId(voiceId))) {
                voiceId = chirpVoices.find((v: ChirpVoice) => v.lang === lang)?.id;
              }
              onPlayTestVoice(lang, voiceId);
            }}
            ariaLabel={`Voz de ${termLabel}`}
          />

          <VoiceSelect
            label={`Voz de ${defLabel}`}
            value={(draft.voiceDefId as string) || ''}
            onChange={(value) => updateDraft({ voiceDefId: value || undefined })}
            ttsProvider={ttsProvider}
            voices={voices}
            chirpVoices={chirpVoices}
            chirpVoicesLoading={chirpVoicesLoading}
            lang={draft.voiceDefLang as string}
            onTest={() => {
              const lang = (draft.voiceDefLang as string) || 'es';
              let voiceId = draft.voiceDefId as string | undefined;
              if (ttsProvider === 'chirp' && (!voiceId || !isChirpVoiceId(voiceId))) {
                voiceId = chirpVoices.find((v: ChirpVoice) => v.lang === lang)?.id;
              }
              onPlayTestVoice(lang, voiceId);
            }}
            ariaLabel={`Voz de ${defLabel}`}
          />

          <RangeSliderField
            label="Velocidad"
            value={(draft.voiceRate as number) ?? 1}
            onChange={(value) => updateDraft({ voiceRate: value })}
            min={0.5}
            max={1.5}
            step={0.05}
            formatValue={(v) => String(Math.round(v * 100))}
            suffix="%"
          />

          <RangeSliderField
            label="Tono"
            value={(draft.voicePitch as number) ?? 1}
            onChange={(value) => updateDraft({ voicePitch: value })}
            min={0.5}
            max={2}
            step={0.05}
            formatValue={(v) => String(Math.round(v * 100))}
            suffix="%"
          />
        </div>
      )}
    </div>
  );
};

interface VoiceSelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  ttsProvider: string;
  voices: SpeechSynthesisVoice[];
  chirpVoices: ChirpVoice[];
  chirpVoicesLoading: boolean;
  lang: string;
  onTest: () => void;
  ariaLabel: string;
}

const VoiceSelect: React.FC<VoiceSelectProps> = ({
  label,
  value,
  onChange,
  ttsProvider,
  voices,
  chirpVoices,
  chirpVoicesLoading,
  lang,
  onTest,
  ariaLabel,
}) => {
  return (
    <div>
      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white border-2 border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
          aria-label={ariaLabel}
        >
          <option value="">Auto (por idioma)</option>
          {ttsProvider === 'chirp'
            ? chirpVoicesLoading
              ? (
                  <option value="" disabled>
                    Cargando voces...
                  </option>
                )
              : chirpVoices
                  .filter((v) => v.lang === (lang || 'es'))
                  .map((opt: ChirpVoice) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))
            : buildVoiceOptions(voices, lang).map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
        </select>
        <button
          type="button"
          onClick={onTest}
          className="px-3 py-2.5 rounded-xl bg-white border-2 border-indigo-100 text-xs font-black text-indigo-600 active:scale-95 transition-all"
          aria-label={`Probar voz de ${label}`}
        >
          🔊
        </button>
      </div>
    </div>
  );
};
