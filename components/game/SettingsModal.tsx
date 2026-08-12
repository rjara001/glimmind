
import React, { useState } from 'react';
import { AssociationList, VoiceCommandId, VoiceLanguage } from '../../types';
import { DEFAULT_VOICE_COMMANDS, resolveVoiceCommands } from '../../services/voice/commands';

const THRESHOLD_MIN = 50;
const THRESHOLD_MAX = 100;
const THRESHOLD_STEP = 5;

const VOICE_LANGUAGE_OPTIONS: { value: VoiceLanguage; label: string }[] = [
  { value: 'es', label: 'Español' },
  { value: 'en', label: 'Inglés' },
  { value: 'fr', label: 'Francés' },
  { value: 'de', label: 'Alemán' },
  { value: 'it', label: 'Italiano' },
  { value: 'pt', label: 'Portugués' },
];

interface SettingsModalProps {
  list: AssociationList;
  onUpdateList: (list: AssociationList) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ list, onUpdateList, onClose }) => {
  const [draft, setDraft] = useState(list.settings);
  const isReversed = draft.flipOrder === 'reversed';
  const isPracticeMode = draft.mode === 'training';
  const isIgnoringArticles = draft.ignoreArticles === true;
  const isShowingHints = draft.showHints !== false;
  const isVoiceEnabled = draft.voiceEnabled === true;
  const thresholdPercent = Math.round(draft.threshold * 100);
  const conceptParts = list.concept.split('/');
  const termLabel = conceptParts[0] || 'Término';
  const defLabel = conceptParts[1] || 'Definición';

  const handleAccept = () => {
    onUpdateList({ ...list, settings: draft });
    onClose();
  };

  const getCommandValue = (id: VoiceCommandId): string => {
    const raw = draft.voiceCommands?.[id];
    if (raw === undefined) return DEFAULT_VOICE_COMMANDS[id].join(', ');
    return raw.join(', ');
  };

  const setCommandValue = (id: VoiceCommandId, value: string) => {
    const keywords = value.split(',').map((keyword) => keyword.trim()).filter(Boolean);
    setDraft({
      ...draft,
      voiceCommands: { ...resolveVoiceCommands(draft.voiceCommands), [id]: keywords },
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200 border border-white" style={{ scrollbarWidth: 'none' }}>
        <h3 className="text-3xl font-black text-slate-900 mb-6 sm:mb-8 tracking-tighter text-center">Settings</h3>
        
        <div className="space-y-4 mb-8">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Game Mode</p>
            <div className="flex gap-2">
              <button 
                onClick={() => setDraft({ ...draft, mode: 'training' })}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isPracticeMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
              >
                Practice
              </button>
              <button 
                onClick={() => setDraft({ ...draft, mode: 'real' })}
                className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isPracticeMode ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'}`}
              >
                Real
              </button>
            </div>
          </div>

          <button 
            onClick={() => setDraft({ ...draft, flipOrder: isReversed ? 'normal' : 'reversed' })}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm ${isReversed ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
              <span className="text-xs font-bold">Flip Cards</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${isReversed ? 'bg-indigo-400' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isReversed ? 'left-5' : 'left-1'}`}></div>
            </div>
          </button>

          <button 
            onClick={() => setDraft({ ...draft, showHints: !isShowingHints })}
            className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all shadow-sm ${isShowingHints ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            aria-label="Toggle hints"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
              <span className="text-xs font-bold">Hints</span>
            </div>
            <div className={`w-10 h-6 rounded-full relative transition-colors ${isShowingHints ? 'bg-indigo-400' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isShowingHints ? 'left-5' : 'left-1'}`}></div>
            </div>
          </button>
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Voice</p>
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-xs font-bold text-slate-700">Enable voice</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pronounce the word and listen to your answer</p>
            </div>
            <button
              onClick={() => setDraft({ ...draft, voiceEnabled: !isVoiceEnabled })}
              className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${isVoiceEnabled ? 'bg-indigo-400' : 'bg-slate-200'}`}
              aria-label="Toggle voice"
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isVoiceEnabled ? 'left-5' : 'left-1'}`}></div>
            </button>
          </div>
          {isVoiceEnabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Idioma de {termLabel}</label>
                <select
                  value={draft.voiceTermLang || 'es'}
                  onChange={(e) => setDraft({ ...draft, voiceTermLang: e.target.value as VoiceLanguage })}
                  className="w-full bg-white border-2 border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  aria-label={`Idioma de ${termLabel}`}
                >
                  {VOICE_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Idioma de {defLabel}</label>
                <select
                  value={draft.voiceDefLang || 'es'}
                  onChange={(e) => setDraft({ ...draft, voiceDefLang: e.target.value as VoiceLanguage })}
                  className="w-full bg-white border-2 border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                  aria-label={`Idioma de ${defLabel}`}
                >
                  {VOICE_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="pt-3 border-t border-slate-200">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Voice commands</p>
                <p className="text-[10px] text-slate-400 mb-3">Comma-separated keywords, recognized in the answer language.</p>
                {(Object.keys(DEFAULT_VOICE_COMMANDS) as VoiceCommandId[]).map((id) => (
                  <div key={id} className="mb-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                      {id}
                    </label>
                    <input
                      type="text"
                      value={getCommandValue(id)}
                      onChange={(e) => setCommandValue(id, e.target.value)}
                      className="w-full bg-white border-2 border-indigo-100 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-4 focus:ring-indigo-100 transition-all"
                      aria-label={`Voice command ${id}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Answer Validation</p>
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs font-bold text-slate-700">Ignore articles</p>
              <p className="text-[10px] text-slate-400 mt-0.5">the, at, to, el, la... not required</p>
            </div>
            <button
              onClick={() => setDraft({ ...draft, ignoreArticles: !isIgnoringArticles })}
              className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 ${isIgnoringArticles ? 'bg-indigo-400' : 'bg-slate-200'}`}
              aria-label="Toggle ignore articles"
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${isIgnoringArticles ? 'left-5' : 'left-1'}`}></div>
            </button>
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-slate-700">Similarity threshold</p>
            <span className="text-xs font-black text-indigo-600">{thresholdPercent}%</span>
          </div>
          <input
            type="range"
            min={THRESHOLD_MIN}
            max={THRESHOLD_MAX}
            step={THRESHOLD_STEP}
            value={thresholdPercent}
            onChange={(e) => setDraft({ ...draft, threshold: Number(e.target.value) / 100 })}
            className="w-full accent-indigo-600"
            aria-label="Similarity threshold"
          />
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>{THRESHOLD_MIN}%</span>
            <span>{THRESHOLD_MAX}%</span>
          </div>
        </div>

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
  )
}
