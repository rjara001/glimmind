
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
  showRevealWarning?: boolean;
  onTryAttempt?: () => void;
  onConfirmReveal?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ onNext, onCheckAnswer, onReveal, onCorrect, revealed, wasRevealed, gameMode, isTransitioning, showRevealWarning, onTryAttempt, onConfirmReveal }) => {
  const isPracticeMode = gameMode === 'training';
  
  const baseButtonClass = "h-12 rounded-2xl font-black uppercase text-[8px] tracking-widest active:scale-90 transition-all flex items-center justify-center";

  // The main action buttons are arranged for correct Tab order.
  // CSS `order` property maintains visual layout.
  // Modo Examen: Validar (disabled after Revelar) | Pasar | Revelar
  // Modo Training: Pasar | Revelar | Correcta (no Validar)
  return (
    <div className="w-full max-w-xl mt-4 px-2 sm:px-0">
      {showRevealWarning && onTryAttempt && onConfirmReveal && (
        <div className="mb-3 bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center justify-between gap-3">
          <p className="text-xs font-bold text-amber-800">Sin intentos. ¿Quieres intentar antes de revelar?</p>
          <div className="flex gap-2">
            <button
              onClick={onTryAttempt}
              className="px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-700 transition"
            >
              Intentar
            </button>
            <button
              onClick={onConfirmReveal}
              className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-50 transition"
            >
              Revelar
            </button>
          </div>
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 bg-white/50 backdrop-blur-sm p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">
        
        {/* Botón Validar: solo en Modo Examen */}
        {!isPracticeMode && (
          <button 
            onClick={onCheckAnswer}
            disabled={isTransitioning || revealed}
            tabIndex={2}
            className={`${baseButtonClass} shadow-sm ${revealed ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'} disabled:opacity-50 disabled:cursor-not-allowed order-2 text-[9px] sm:text-[8px]`}
          >
            Validar
          </button>
        )}

        <button 
          onClick={onNext} 
          disabled={isTransitioning}
          tabIndex={isPracticeMode ? 3 : 4}
          className={`${baseButtonClass} bg-slate-50 border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed order-1 text-[9px] sm:text-[8px]`}
        >
          Pasar
        </button>
        
        {/* Botón Revelar: en Modo Examen (no revelado) o Modo Training (no revelado) */}
        {(!isPracticeMode || !revealed) && (
          <button 
            onClick={onReveal}
            disabled={isTransitioning || (isPracticeMode && revealed)}
            tabIndex={isPracticeMode ? 2 : 3}
            className={`${baseButtonClass} bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed order-3 text-[9px] sm:text-[8px]`}
          >
            Revelar
          </button>
        )}

        {/* Botón Correcta: solo cuando está revelado (en Examen) o siempre (en Training) */}
        {isPracticeMode && (
          <button 
            onClick={onCorrect} 
            disabled={isTransitioning || (revealed && wasRevealed)}
            tabIndex={1}
            className={`${baseButtonClass} shadow-md gap-2 ${isTransitioning || (revealed && wasRevealed) ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'} order-3 text-[9px] sm:text-[8px]`}
          >
            Correcta
          </button>
        )}
      </div>
    </div>
  )
}
