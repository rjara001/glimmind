
import React from 'react';
import { GameMode } from '../../types';

interface GameControlsProps {
  onNext: () => void;
  onCheckAnswer: () => void;
  onReveal: () => void;
  onCorrect: () => void;
  revealed: boolean;
  wasRevealed: boolean;
  gameMode: GameMode;
  isTransitioning: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({ onNext, onCheckAnswer, onReveal, onCorrect, revealed, wasRevealed, gameMode, isTransitioning }) => {
  const isPracticeMode = gameMode === 'training';
  
  const baseButtonClass = "h-12 rounded-2xl font-black uppercase text-[8px] tracking-widest active:scale-90 transition-all flex items-center justify-center";

  return (
    <div className="w-full max-w-xl mt-4">
      <div className="grid grid-cols-3 gap-3 bg-white/50 backdrop-blur-sm p-3 rounded-3xl border border-slate-100 shadow-sm">
        <button 
          onClick={onNext} 
          disabled={isTransitioning}
          className={`${baseButtonClass} bg-slate-50 border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Pasar
        </button>
        
        <button 
          onClick={() => {
            if (!isPracticeMode && !revealed) {
              onCheckAnswer();
            } else {
              onReveal();
            }
          }} 
          disabled={isTransitioning}
          className={`${baseButtonClass} shadow-sm ${revealed ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-white text-indigo-600 border border-indigo-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {!isPracticeMode && !revealed ? 'Validar' : revealed ? 'Ocultar' : 'Revelar'}
        </button>

        <button 
          onClick={onCorrect} 
          disabled={isTransitioning || (!isPracticeMode && (wasRevealed || revealed))}
          className={`${baseButtonClass} shadow-md gap-2 ${isTransitioning || (!isPracticeMode && (wasRevealed || revealed)) ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
        >
          Correcta
        </button>
      </div>
    </div>
  )
}
