import React from 'react';
import { maskHint, getAutoHintMode } from '../../utils/maskHint';
import { getLanguageFlag } from '../../services/voice/languageFlags';

interface CardContentProps {
  displayTerm: string | undefined;
  displayDef: string | undefined;
  labelTerm: string;
  labelDef: string;
  isPracticeMode: boolean;
  revealed: boolean;
  userInput: string;
  onUserInput: (value: string) => void;
  feedback: 'none' | 'correct' | 'incorrect';
  showHints?: boolean;
  currentCycle: number;
  attemptCount?: number;
  inputRef?: React.Ref<HTMLInputElement>;
  voiceEnabled?: boolean;
  voiceTermLang?: string;
  voiceDefLang?: string;
  shakeClass?: string;
}

export const CardContent: React.FC<CardContentProps> = ({
  displayTerm,
  displayDef,
  labelTerm,
  labelDef,
  isPracticeMode,
  revealed,
  userInput,
  onUserInput,
  feedback,
  showHints = true,
  currentCycle = 1,
  attemptCount,
  inputRef,
  voiceEnabled,
  voiceTermLang,
  voiceDefLang,
  shakeClass = '',
}) => {
  const isDefinitionHidden = isPracticeMode && !revealed && !showHints;
  const effectiveHintMode = showHints ? getAutoHintMode(currentCycle) : false;
  const showAttemptCounter = typeof attemptCount === 'number' && !isPracticeMode;

  const renderLabel = (label: string, lang: string | undefined) => {
    if (!voiceEnabled) return label;
    const flag = getLanguageFlag(lang);
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-sm leading-none">{flag}</span>
        <span>{label}</span>
      </span>
    );
  };

  return (
    <>
      <h2 className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 mb-3 break-words leading-tight tracking-tight">{displayTerm}</h2>

      <div className="min-h-[100px] flex flex-col items-center justify-center gap-2">
        {!isPracticeMode && !revealed ? (
          <div className="w-full max-w-sm">
            <input
              ref={inputRef}
              type="text"
              tabIndex={1}
              value={userInput}
              onChange={(e) => onUserInput(e.target.value)}
              className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-base font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center disabled:opacity-50 ${shakeClass}`}
            />
             {showHints && !revealed && (
                <div className="mt-1 text-center">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{renderLabel(labelDef, voiceDefLang)}</span>
                 <p className="text-base font-medium text-slate-300 bg-slate-50/50 px-3 py-1 rounded-xl border border-slate-100/50 inline-block break-words">
                   {maskHint(displayDef, effectiveHintMode)}
                 </p>
                 {showAttemptCounter && typeof attemptCount === 'number' && (
                   <span className="block text-[10px] text-slate-400 font-medium mt-1">intentos: {attemptCount}</span>
                 )}
               </div>
             )}
           </div>
        ) : (
          <div className="text-center">
            {!isDefinitionHidden && (
               <>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{renderLabel(labelDef, voiceDefLang)}</span>
                 <p className={`text-xl sm:text-2xl md:text-3xl font-black break-words ${revealed || !isPracticeMode ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-300 bg-slate-50/50'} px-4 py-2 rounded-2xl border-2 ${revealed || !isPracticeMode ? 'border-indigo-100/50' : 'border-slate-100/50'} inline-block shadow-sm`}>
                   {revealed || !isPracticeMode ? displayDef : maskHint(displayDef, effectiveHintMode)}
                 </p>
               </>
            )}
          </div>
        )}
      </div>
    </>
  );
};
