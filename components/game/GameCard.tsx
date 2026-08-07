import React, { useRef, useEffect, useState } from 'react';
import { maskHint, getAutoHintMode } from '../../utils/maskHint';

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
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const editTermRef = useRef<HTMLInputElement>(null);
  const editDefRef = useRef<HTMLInputElement>(null);
  const [editTerm, setEditTerm] = useState(displayTerm || '');
  const [editDef, setEditDef] = useState(displayDef || '');

  useEffect(() => {
    setEditTerm(displayTerm || '');
    setEditDef(displayDef || '');
  }, [displayTerm, displayDef]);

  useEffect(() => {
    if (!isPracticeMode && !revealed && feedback === 'none') {
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  }, [isPracticeMode, revealed, feedback]);

  useEffect(() => {
    if (isEditing) {
      requestAnimationFrame(() => {
        editTermRef.current?.focus();
        editTermRef.current?.select();
      });
    }
  }, [isEditing]);

  const cycleStyles: Record<string, { bg: string, border: string, text: string, decoration: string }> = {
    sky: { bg: 'bg-sky-50', border: 'border-sky-500/20', text: 'text-sky-500', decoration: 'bg-sky-600/10' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-500/20', text: 'text-yellow-600', decoration: 'bg-yellow-600/10' },
    rose: { bg: 'bg-rose-50', border: 'border-rose-500/20', text: 'text-rose-500', decoration: 'bg-rose-600/10' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-500/20', text: 'text-emerald-600', decoration: 'bg-emerald-600/10' },
    slate: { bg: 'bg-slate-50', border: 'border-slate-500/20', text: 'text-slate-500', decoration: 'bg-slate-600/10' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-500/20', text: 'text-indigo-400', decoration: 'bg-indigo-600/10' },
  };

  const currentStyle = cycleStyles[cycleColorName] || cycleStyles.indigo;

  const feedbackClasses = feedback === 'correct' 
    ? 'ring-8 ring-emerald-400 border-emerald-500'
    : feedback === 'incorrect' 
      ? 'ring-8 ring-rose-400 border-rose-500'
      : currentStyle.border;

  const showIncorrectFeedback = feedback === 'incorrect' && similarity !== null;
  const showLastAttempt = Boolean(lastAttempt && feedback !== 'none' && !revealed);
  const isDefinitionHidden = isPracticeMode && !revealed && !showHints;
  const effectiveHintMode = showHints ? getAutoHintMode(currentCycle) : false;
  const showEditButton = associationId && onEditCard && !isEditing && revealed;

  const handleSaveEdit = () => {
    if (!onEditCard) return;
    onEditCard(editTerm, editDef);
  };

  const handleCancelEdit = () => {
    setEditTerm(displayTerm || '');
    setEditDef(displayDef || '');
    onCancelEdit?.();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEdit();
    }
  };

  return (
    <div className={`w-full rounded-[2.5rem] shadow-[0_15px_45px_rgba(79,70,229,0.06)] border-4 p-5 md:p-6 text-center relative overflow-hidden min-h-[100px] flex flex-col justify-center transition-all duration-500 ${currentStyle.bg} ${feedbackClasses}`}>
      <div className={`absolute top-0 left-0 w-full h-1.5 ${currentStyle.decoration} transition-colors duration-500`}></div>
      {showEditButton && (
        <button
          onClick={onStartEdit}
          className="absolute top-4 right-4 text-slate-300 hover:text-indigo-500 transition-all p-2 rounded-xl hover:bg-white/50"
          aria-label="Edit card"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.862 4.487z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L18 9.375M19.5 7.125L16.5 4.125M19.5 7.125H16.5" />
          </svg>
        </button>
      )}
      <span className={`text-[9px] font-black uppercase tracking-[0.3em] block mb-1 transition-colors duration-500 ${currentStyle.text}`}>{labelTerm}</span>
      
      {isEditing ? (
        <div className="w-full max-w-full sm:max-w-2xl mx-auto space-y-4">
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{labelTerm}</label>
            <input
              ref={editTermRef}
              type="text"
              value={editTerm}
              onChange={(e) => setEditTerm(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-5 py-3 text-xl sm:text-2xl font-black text-slate-900 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center"
              placeholder="Term"
            />
          </div>
          <div>
            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{labelDef}</label>
            <textarea
              ref={editDefRef as any}
              value={editDef}
              onChange={(e) => setEditDef(e.target.value)}
              onKeyDown={handleEditKeyDown}
              className="w-full bg-white border-2 border-indigo-100 rounded-2xl px-5 py-3 text-lg sm:text-xl font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center resize-none"
              placeholder="Definition"
              rows={2}
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSaveEdit}
              className="flex-1 bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all"
            >
              Guardar
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-6 bg-white border-2 border-slate-200 text-slate-600 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
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
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-4 py-2 text-base font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 transition-all outline-none text-center disabled:opacity-50"
                />
                {showHints && !revealed && (
                  <div className="mt-1 text-center">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-0.5">{labelDef}</span>
                    <p className="text-base font-medium text-slate-300 bg-slate-50/50 px-3 py-1 rounded-xl border border-slate-100/50 inline-block break-words">
                      {maskHint(displayDef, effectiveHintMode)}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center">
                {showLastAttempt && (
                   <div className="mb-3">
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tu respuesta</span>
                     <p className="text-xl font-medium text-slate-500 line-through">
                       {lastAttempt}
                     </p>
                   </div>
                )}
                {!isDefinitionHidden && (
                  <>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{labelDef}</span>
                    <p className={`text-xl sm:text-2xl md:text-3xl font-black break-words ${revealed || !isPracticeMode ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-300 bg-slate-50/50'} px-4 py-2 rounded-2xl border-2 ${revealed || !isPracticeMode ? 'border-indigo-100/50' : 'border-slate-100/50'} inline-block shadow-sm`}>
                      {revealed || !isPracticeMode ? displayDef : maskHint(displayDef, effectiveHintMode)}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
