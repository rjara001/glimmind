import React, { useEffect, useState } from 'react';
import { GameVoicePhase } from '../../hooks/voice/useGameVoice';
import { VoiceCommandId } from '../../types';
import { getLanguageFlag } from '../../services/voice/languageFlags';
import { CardBadges } from './CardBadges';
import { CardToolbar } from './CardToolbar';
import { CardVoiceIndicator } from './CardVoiceIndicator';
import { CardFeedback } from './CardFeedback';
import { CardContent } from './CardContent';
import { CommandToast } from './CommandToast';

interface GameCardProps {
  displayTerm: string | undefined;
  displayDef: string | undefined;
  labelTerm: string;
  labelDef: string;
  revealed: boolean;
  isNearComplete?: boolean;
  isPracticeMode: boolean;
  userInput: string;
  onUserInput: (value: string) => void;
  feedback: 'none' | 'correct' | 'incorrect';
  similarity: number | null;
  lastAttempt: string;
  cycleColorName?: string;
  showHints?: boolean;
  currentCycle: number;
  associationId?: string;
  onStartEdit?: () => void;
  attemptCount?: number;
  inputRef?: React.Ref<HTMLInputElement>;
  voiceMode?: boolean;
  voicePhase?: GameVoicePhase;
  voiceTranscript?: string;
  voiceInterim?: string;
  isVoiceListening?: boolean;
  voiceError?: string | null;
  voiceEnabled?: boolean;
  voiceTermLang?: string;
  voiceDefLang?: string;
  onSpeakAnswer?: (text: string, lang: string) => void;
  detectedVoiceCommand?: VoiceCommandId;
  isFallbackActive?: boolean;
  engineDisclaimer?: string;
  engineFoundAnswers?: string[];
}

export const GameCard: React.FC<GameCardProps> = ({ 
  displayTerm, 
  displayDef, 
  labelTerm, 
  labelDef, 
  revealed, 
  isNearComplete,
  isPracticeMode, 
  userInput, 
  onUserInput, 
  feedback,
  similarity,
  lastAttempt,
  cycleColorName = 'indigo',
  showHints = true,
  currentCycle = 1,
  associationId,
  onStartEdit,
  attemptCount,
  inputRef,
  voiceMode,
  voicePhase,
  voiceTranscript,
  voiceInterim,
  isVoiceListening,
  voiceError,
  voiceEnabled,
  voiceTermLang,
  voiceDefLang,
  onSpeakAnswer,
  detectedVoiceCommand,
  isFallbackActive,
  engineDisclaimer,
  engineFoundAnswers,
}) => {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (feedback === 'incorrect') {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 600);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  const shakeClass = isShaking ? 'animate-shake' : '';

  const showEditButton = Boolean(associationId && onStartEdit && revealed);

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
    <div className={`w-full rounded-[2.5rem] shadow-[0_15px_45px_rgba(79,70,229,0.06)] border-4 p-5 md:p-6 text-center relative min-h-[100px] flex flex-col justify-center transition-all duration-500 bg-rose-50 border-rose-500/20 ${feedback === 'correct' ? 'ring-8 ring-emerald-400 border-emerald-500' : feedback === 'incorrect' ? 'ring-8 ring-rose-400 border-rose-500' : ''}`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-rose-600/10 transition-colors duration-500"></div>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
      <CardToolbar
        showEditButton={showEditButton}
        onStartEdit={onStartEdit}
        revealed={revealed}
        onSpeakAnswer={onSpeakAnswer}
        displayDef={displayDef}
        voiceDefLang={voiceDefLang}
      />
      {engineDisclaimer && (
        <div className="mb-2 inline-flex items-center gap-1.5 self-center px-3 py-1 rounded-full bg-white/70 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-rose-700">
            {engineDisclaimer}
          </span>
        </div>
      )}
      {engineFoundAnswers && engineFoundAnswers.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center justify-center gap-1 self-center">
          {engineFoundAnswers.map((answer, index) => (
            <span
              key={`${answer}-${index}`}
              className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-[10px] font-bold"
            >
              {answer}
            </span>
          ))}
        </div>
      )}
      <span className="text-[9px] font-black uppercase tracking-[0.3em] block mb-1 text-rose-500">{renderLabel(labelTerm, voiceTermLang)}</span>

      <CardBadges
        isFallbackActive={isFallbackActive}
      />

      <CommandToast command={detectedVoiceCommand ?? null} />

      <CardContent
        displayTerm={displayTerm}
        displayDef={displayDef}
        labelTerm={labelTerm}
        labelDef={labelDef}
        isPracticeMode={isPracticeMode}
        revealed={revealed}
        isNearComplete={isNearComplete}
        userInput={userInput}
        onUserInput={onUserInput}
        feedback={feedback}
        showHints={showHints}
        currentCycle={currentCycle}
        attemptCount={attemptCount}
        inputRef={inputRef}
        voiceEnabled={voiceEnabled}
        voiceTermLang={voiceTermLang}
        voiceDefLang={voiceDefLang}
        shakeClass={shakeClass}
      />
      <CardFeedback
        feedback={feedback}
        similarity={similarity}
        lastAttempt={lastAttempt}
        isShaking={isShaking}
      />
      <CardVoiceIndicator
        voiceMode={voiceMode}
        voicePhase={voicePhase}
        voiceTranscript={voiceTranscript}
        voiceInterim={voiceInterim}
        isVoiceListening={isVoiceListening}
        voiceError={voiceError}
        feedback={feedback}
        similarity={similarity}
      />
    </div>
  );
};
