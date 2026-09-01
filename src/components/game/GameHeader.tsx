import React from 'react';
import { GameHeaderProps } from '../../types/game-header-props';
import { SessionBar } from './SessionBar';

export const GameHeader: React.FC<GameHeaderProps> = ({
  listName,
  currentIndex,
  queueLength,
  cycle4Count,
  onBack,
  ...sessionBarProps
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-2">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm group">
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-slate-800 leading-none">{listName}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-semibold text-slate-400">Queue {currentIndex + 1}/{queueLength}</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span className="text-xs font-semibold text-emerald-500">{cycle4Count} in Cycle 4</span>
          </div>
        </div>
      </div>

      <SessionBar {...sessionBarProps} />
    </div>
  );
};
