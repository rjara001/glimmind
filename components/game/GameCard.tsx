
import React, { useRef, useEffect, useState } from 'react';

interface GameCardProps {
  displayTerm: string | undefined;
  displayDef: string | undefined;
  labelTerm: string;
  labelDef: string;
  revealed: boolean;
  isPracticeMode: boolean;
  userInput: string;
  onUserInput: (value: string) => void;
  onCheckAnswer: () => void;
  feedback: 'none' | 'correct' | 'incorrect';
  cycleColorName?: string;
  similarity: number | null;
  lastAttempt: string;
  onNextCard?: () => void;
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
  onCheckAnswer,
  feedback,
  cycleColorName = 'indigo',
  similarity,
  lastAttempt,
  onNextCard,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showValidationMessage, setShowValidationMessage] = useState(false);

  useEffect(() => {
    if (feedback !== 'none') {
      setShowValidationMessage(true);
      const timer = setTimeout(() => {
        setShowValidationMessage(false);
        if (feedback === 'correct' && onNextCard) {
          onNextCard();
        }
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [feedback, onNextCard]);

  useEffect(() => {
    if (!isPracticeMode && !revealed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [revealed, isPracticeMode, feedback]);

  const feedbackClasses = feedback === 'correct' 
    ? `ring-8 ring-emerald-400 border-emerald-500`
    : feedback === 'incorrect' 
      ? `ring-8 ring-rose-400 border-rose-500`
      : `border-${cycleColorName}-500/20`;

  const showIncorrectFeedback = feedback === 'incorrect' && similarity !== null;
  const showLastAttempt = lastAttempt && feedback !== 'none' && !revealed;

  const validationMessage = showValidationMessage && lastAttempt && displayDef ? (
    <div className={`mt-3 px-4 py-2 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-bottom-2 ${
      feedback === 'correct' 
        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
        : 'bg-rose-100 text-rose-700 border border-rose-200'
    }`}>
      <span className="line-through mr-2">{lastAttempt}</span>
      <span>/</span>
      <span className="ml-2">{displayDef}</span>
    </div>
  ) : null;

  return (
    <div className={`w-full bg-white rounded-[2.5rem] shadow-[0_15px_45px_rgba(79,70,229,0.06)] border-4 p-6 md:p-10 text-center relative overflow-hidden min-h-[300px] flex flex-col justify-center transition-all duration-300 ${feedbackClasses}`}>
      <div className={`absolute top-0 left-0 w-full h-1.5 bg-${cycleColorName}-600/10`}></div>
      <span className={`text-[9px] font-black text-${cycleColorName}-400 uppercase tracking-[0.3em] block mb-1`}>{labelTerm}</span>
      <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 break-words leading-tight tracking-tight">{displayTerm}</h2>
      
      <div className="min-h-[100px] flex flex-col items-center justify-center gap-4">
        {!isPracticeMode && !revealed ? (
          <div className="w-full max-w-sm animate-in slide-in-from-bottom-2 duration-300">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => onUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCheckAnswer()}
              className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-base font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-${cycleColorName}-100 transition-all outline-none text-center`}
            />
            <div className="h-8 mt-2 text-sm text-slate-400 font-medium truncate">
              {showIncorrectFeedback ? (
                <span className="text-rose-500 font-bold animate-in fade-in">
                   similitud del {similarity}%.
                </span>
              ) : (
                <span>{userInput || '...'}</span>
              )}
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in zoom-in-95 duration-500 text-center">
            {showLastAttempt && (
               <div className="mb-4">
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tu respuesta</span>
                 <p className={`text-xl font-medium text-slate-500 line-through`}>
                   {lastAttempt}
                 </p>
               </div>
            )}
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">{labelDef}</span>
            <p className={`text-2xl md:text-3xl font-black text-${cycleColorName}-600 bg-${cycleColorName}-50/50 px-6 py-3 rounded-2xl border-2 border-${cycleColorName}-100/50 inline-block shadow-sm`}>
              {displayDef}
            </p>
          </div>
        )}
        {validationMessage}
      </div>
    </div>
  )
}
