import React, { useRef, useEffect, useState } from 'react';
import { GameVoicePhase } from '../../hooks/voice/useGameVoice';
import { getLanguageFlag } from '../../services/voice/languageFlags';
import { CardBadges } from './CardBadges';
import { CardToolbar } from './CardToolbar';
import { CardVoiceIndicator } from './CardVoiceIndicator';
import { CardFeedback } from './CardFeedback';
import { CardEditForm } from './CardEditForm';
import { CardContent } from './CardContent';

interface GameCardProps {
  displayTerm: string | undefined;
  displayDef: string | undefined;
  labelTerm: string;
  labelDef: string;
  revealed: boolean;
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
  onEditCard?: (term: string, definition: string) => void;
  isEditing?: boolean;
  onStartEdit?: () => void;
  onCancelEdit?: () => void;
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
  detectedVoiceCommand?: string;
  isFallbackActive?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({ 
  displayTerm, 
  displayDef, 
  labelTerm, 
  labelDef, 
  revealed, 
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
  onEditCard,
  isEditing = false,
  onStartEdit,
  onCancelEdit,
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
}) => {
  const [isShaking, setIsShaking] = useState(false);
  const [showCommandToast, setShowCommandToast] = useState(false);
  const [commandToastText, setCommandToastText] = useState('');

  useEffect(() => {
    if (feedback === 'incorrect') {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 600);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  useEffect(() => {
    if (detectedVoiceCommand) {
      setCommandToastText(`Comando detectado: ${detectedVoiceCommand}`);
      setShowCommandToast(true);
      const timer = setTimeout(() => setShowCommandToast(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [detectedVoiceCommand]);

  const shakeClass = isShaking ? 'animate-shake' : '';

  const showEditButton = associationId && onEditCard && !isEditing && revealed;

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

  const handleCancelEdit = () => {
    onCancelEdit?.();
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
      <span className="text-[9px] font-black uppercase tracking-[0.3em] block mb-1 text-rose-500">{renderLabel(labelTerm, voiceTermLang)}</span>

      <CardBadges
        showCommandToast={showCommandToast}
        commandToastText={commandToastText}
        isFallbackActive={isFallbackActive}
      />
      
      {isEditing ? (
        <CardEditForm
          labelTerm={labelTerm}
          labelDef={labelDef}
          initialTerm={displayTerm || ''}
          initialDef={displayDef || ''}
          onSave={onEditCard!}
          onCancel={handleCancelEdit}
          voiceTermLang={voiceTermLang}
          voiceDefLang={voiceDefLang}
        />
      ) : (
        <>
          <CardContent
            displayTerm={displayTerm}
            displayDef={displayDef}
            labelTerm={labelTerm}
            labelDef={labelDef}
            isPracticeMode={isPracticeMode}
            revealed={revealed}
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
        </>
      )}
    </div>
  );
};
