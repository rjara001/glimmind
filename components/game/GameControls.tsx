
import React from 'react';
import { GameMode } from '../../types';

interface GameControlsProps {
  onNext: () => void;
  onCheckAnswer: () => void;
  onReveal: () => void;
  onCorrect: () => void;
  revealed: boolean;
  gameMode: GameMode;
  isTransitioning: boolean;
}

export const GameControls: React.FC<GameControlsProps> = ({ onNext, onCheckAnswer, onReveal, onCorrect, revealed, gameMode, isTransitioning }) => {
  const isPracticeMode = gameMode === 'training';
  
  const baseButtonClass = "h-12 rounded-2xl font-black uppercase text-[8px] tracking-widest active:scale-90 transition-all flex items-center justify-center";

  // The main action buttons are arranged for correct Tab order.
  // CSS `order` property maintains visual layout.
  // Modo Examen: Validar (disabled after Revelar) | Pasar | Revelar
  // Modo Training: Pasar | Revelar | Correcta (no Validar)
  return (
    <div className="w-full max-w-xl mt-4">
      <div className="grid grid-cols-3 gap-3 bg-white/50 backdrop-blur-sm p-3 rounded-3xl border border-slate-100 shadow-sm">
        
        {/* Botón Validar: solo en Modo Examen */}
        {!isPracticeMode && (
          <button 
            onClick={onCheckAnswer}
            disabled={isTransitioning || revealed}
            tabIndex={2}
            className={`${baseButtonClass} shadow-sm ${revealed ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'} disabled:opacity-50 disabled:cursor-not-allowed order-2`}
          >
            Validar
          </button>
        )}

        <button 
          onClick={onNext} 
          disabled={isTransitioning}
          tabIndex={isPracticeMode ? 3 : 4}
          className={`${baseButtonClass} bg-slate-50 border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed order-1`}
        >
          Pasar
        </button>
        
        {/* Botón Revelar: en Modo Examen (no revelado) o Modo Training (no revelado) */}
        {(!isPracticeMode || !revealed) && (
          <button 
            onClick={onReveal}
            disabled={isTransitioning || (isPracticeMode && revealed)}
            tabIndex={isPracticeMode ? 2 : 3}
            className={`${baseButtonClass} bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed order-3`}
          >
            Revelar
          </button>
        )}

        {/* Botón Correcta: solo cuando está revelado (en Examen) o siempre (en Training) */}
        {isPracticeMode && (
          <button 
            onClick={onCorrect} 
            disabled={isTransitioning}
            tabIndex={1}
            className={`${baseButtonClass} shadow-md gap-2 ${isTransitioning ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'} order-3`}
          >
            Correcta
          </button>
        )}
      </div>
    </div>
  )
}
