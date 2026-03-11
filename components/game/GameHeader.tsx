
import React from 'react';

interface GameHeaderProps {
  listName: string;
  currentIndex: number;
  queueLength: number;
  knownCount: number;
  gameMode: 'training' | 'real';
  onBack: () => void;
}

export const GameHeader: React.FC<GameHeaderProps> = ({ listName, currentIndex, queueLength, knownCount, gameMode, onBack }) => {
  const isPracticeMode = gameMode === 'training';

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex flex-col">
          <h2 className="text-xs font-black text-slate-800 leading-none">{listName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Fila {currentIndex + 1}/{queueLength}</span>
            <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">{knownCount} Conocidas</span>
          </div>
        </div>
      </div>

      <div className="hidden sm:flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
        <span className="px-3 py-1 text-[8px] font-black text-slate-500 uppercase tracking-widest">
          {isPracticeMode ? 'Modo Práctica' : 'Modo Real'}
        </span>
      </div>
    </div>
  )
}
