
import React, { useRef, useEffect } from 'react';

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
  feedback
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isPracticeMode && !revealed && inputRef.current) {
      inputRef.current.focus();
    }
  }, [revealed, isPracticeMode]);

  return (
    <div className={`w-full bg-white rounded-[2.5rem] shadow-[0_15px_45px_rgba(79,70,229,0.06)] border-4 border-white p-6 md:p-10 text-center relative overflow-hidden min-h-[300px] flex flex-col justify-center transition-all duration-300 ${feedback === 'correct' ? 'ring-8 ring-emerald-400' : feedback === 'incorrect' ? 'ring-8 ring-rose-400' : ''}`}>
      <div className="absolute top-0 left-0 w-full h-1.5 bg-indigo-600/10"></div>
      <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.3em] block mb-1">{labelTerm}</span>
      <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 break-words leading-tight tracking-tight">{displayTerm}</h2>
      
      <div className="min-h-[100px] flex flex-col items-center justify-center gap-4">
        {!isPracticeMode && !revealed ? (
          <div className="w-full max-w-sm animate-in slide-in-from-bottom-2 duration-300">
            <input
              ref={inputRef}
              type="text"
              autoFocus
              value={userInput}
              onChange={(e) => onUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onCheckAnswer()}
              placeholder={`¿Cuál es el/la ${labelDef.toLowerCase()}?`}
              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 text-base font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center"
            />
          </div>
        ) : (
          <>
            {revealed ? (
              <div className="animate-in fade-in zoom-in slide-in-from-bottom-2 duration-500 text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">{labelDef}</span>
                <p className="text-2xl md:text-3xl font-black text-indigo-600 bg-indigo-50/50 px-6 py-3 rounded-2xl border-2 border-indigo-100/50 inline-block shadow-sm">
                  {displayDef}
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-7 h-10 bg-slate-50 rounded-lg animate-pulse border-2 border-slate-100 flex items-center justify-center text-slate-200 font-black text-lg">?</div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
