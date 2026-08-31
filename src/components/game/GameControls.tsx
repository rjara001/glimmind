import React from 'react';
import { GameMode } from '../../types';

interface GameControlsProps {
  onNext: () => void;
  onPrev: () => void;
  canGoBack: boolean;
  onCheckAnswer: () => void;
  onReveal: () => void;
  onCorrect: () => void;
  revealed: boolean;
  wasRevealed: boolean;
  gameMode: GameMode;
  isTransitioning: boolean;
  attemptCount?: number;
  showRevealWarning?: boolean;
  onTryAttempt?: () => void;
  onConfirmReveal?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ onNext, onPrev, canGoBack, onCheckAnswer, onReveal, onCorrect, revealed, gameMode, isTransitioning, attemptCount, showRevealWarning, onTryAttempt, onConfirmReveal }) => {
  const isPracticeMode = gameMode === 'training';

  const baseButtonClass = "h-12 rounded-2xl font-black uppercase text-[8px] tracking-widest active:scale-90 transition-all flex items-center justify-center";

  return (
    <div className="justify-self-center w-full max-w-xl mt-4 px-2 sm:px-0">
      <div className="grid grid-cols-4 gap-2 sm:gap-3 bg-white/50 backdrop-blur-sm p-2 sm:p-3 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-sm">

        <button
          onClick={onPrev}
          disabled={!canGoBack}
          tabIndex={1}
          className={`${baseButtonClass} ${canGoBack ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50' : 'bg-slate-100 text-slate-300 cursor-not-allowed'} disabled:opacity-50 disabled:cursor-not-allowed order-1 text-[9px] sm:text-[8px]`}
          aria-label="Atrás"
          title="Atrás"
        >
          Atrás
        </button>

        <button
          onClick={onNext}
          disabled={isTransitioning}
          tabIndex={2}
          className={`${baseButtonClass} bg-slate-50 border border-slate-200 text-slate-500 hover:bg-white hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed order-2 text-[9px] sm:text-[8px]`}
        >
          Siguiente
        </button>

        {!isPracticeMode && (
          <button
            onClick={onCheckAnswer}
            disabled={isTransitioning || revealed}
            tabIndex={3}
            className={`${baseButtonClass} shadow-sm ${revealed ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'} disabled:opacity-50 disabled:cursor-not-allowed order-3 text-[9px] sm:text-[8px]`}
          >
            Validar
          </button>
        )}

        {(!isPracticeMode || !revealed) && (
          <button
            onClick={() => {
              if (showRevealWarning && onConfirmReveal) {
                onConfirmReveal();
              } else if (typeof attemptCount === 'number' && attemptCount === 0 && onTryAttempt) {
                onTryAttempt();
              } else {
                onReveal();
              }
            }}
            disabled={isTransitioning || (isPracticeMode && revealed)}
            tabIndex={3}
            className={`${baseButtonClass} bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 disabled:opacity-50 disabled:cursor-not-allowed order-3 text-[9px] sm:text-[8px]`}
          >
            Revelar
          </button>
        )}

        {isPracticeMode && (
          <button
            onClick={onCorrect}
            disabled={isTransitioning}
            tabIndex={4}
            className={`${baseButtonClass} shadow-md gap-2 ${isTransitioning ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'} order-4 text-[9px] sm:text-[8px]`}
          >
            Correcta
          </button>
        )}


      </div>
    </div>
  )
}