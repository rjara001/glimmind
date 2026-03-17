
import React from 'react';
import { GameHeaderProps } from '../../types/game-header-props';

export const GameHeader: React.FC<GameHeaderProps> = ({ listName, currentIndex, queueLength, cycle4Count, gameMode, onBack, onSettingsClick }) => {
  const isPracticeMode = gameMode === 'training';

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

      <div className="flex items-center gap-2">
          <div className="hidden sm:flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
            <span className="px-3 py-1 text-xs font-bold text-slate-500">
              {isPracticeMode ? 'Practice Mode' : 'Real Mode'}
            </span>
          </div>
          <button onClick={onSettingsClick} className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm group">
            <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.991s.145.75.438.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.991s-.145-.75-.437-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
      </div>
    </div>
  )
}
