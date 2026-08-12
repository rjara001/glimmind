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
  attemptCount?: number;
  showRevealWarning?: boolean;
  onTryAttempt?: () => void;
  onConfirmReveal?: () => void;
  voiceMode?: boolean;
  isVoiceListening?: boolean;
  onRepeat?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({ onNext, onCheckAnswer, onReveal, onCorrect, revealed, wasRevealed, gameMode, isTransitioning, attemptCount, showRevealWarning, onTryAttempt, onConfirmReveal, voiceMode, isVoiceListening, onRepeat }) => {
  const isPracticeMode = gameMode === 'training';

  const baseButtonClass = "h-12 sm:h-11 rounded-2xl font-black uppercase tracking-widest active:scale-95 transition-all flex items-center justify-center select-none";

  return (
    <div className="w-full max-w-xl mt-4 px-3 sm:px-0">
      <div className="grid grid-cols-3 gap-3 sm:gap-2 bg-white/60 backdrop-blur-sm p-3 sm:p-2.5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm">

        {!isPracticeMode && (
          <button
            onClick={onCheckAnswer}
            disabled={isTransitioning || revealed}
            tabIndex={2}
            className={`${baseButtonClass} shadow-sm text-[11px] sm:text-[8px] ${revealed ? 'bg-indigo-100 text-indigo-300 border border-indigo-200 cursor-not-allowed' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 active:bg-indigo-100'} disabled:opacity-50 disabled:cursor-not-allowed order-2`}
          >
            Validar
          </button>
        )}

        <button
          onClick={onNext}
          disabled={isTransitioning}
          tabIndex={isPracticeMode ? 3 : 4}
          className={`${baseButtonClass} bg-slate-50 border border-slate-200 text-slate-600 hover:bg-white hover:text-indigo-600 active:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed order-1 text-[11px] sm:text-[8px]`}
        >
          Pasar
        </button>

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
            tabIndex={isPracticeMode ? 2 : 3}
            className={`${baseButtonClass} bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50 active:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed order-3 text-[11px] sm:text-[8px]`}
          >
            Revelar
          </button>
        )}

        {isPracticeMode && (
          <button
            onClick={onCorrect}
            disabled={isTransitioning || (revealed && wasRevealed)}
            tabIndex={1}
            className={`${baseButtonClass} shadow-md gap-2 text-[11px] sm:text-[8px] ${isTransitioning || (revealed && wasRevealed) ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800'} order-3`}
          >
            Correcta
          </button>
        )}

        {voiceMode && onRepeat && (
          <button
            onClick={onRepeat}
            disabled={isTransitioning}
            tabIndex={1}
            className={`${baseButtonClass} order-3 text-[11px] sm:text-[8px] ${isVoiceListening ? 'bg-rose-500 text-white border border-rose-600 shadow-md' : 'bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 active:bg-rose-100'} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isVoiceListening ? 'Escuchando…' : 'Repetir'}
          </button>
        )}
      </div>
    </div>
  )
}
