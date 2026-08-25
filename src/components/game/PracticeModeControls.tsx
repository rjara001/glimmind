import React from 'react';
import { PlayerPhase, PlayerStatus } from '../../types/player-controls';

interface PracticeModeControlsProps {
  status: PlayerStatus;
  phase: PlayerPhase;
  remainingSeconds: number;
  canPrev: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onPrev: () => void;
}

export const PracticeModeControls: React.FC<PracticeModeControlsProps> = ({
  status,
  phase,
  remainingSeconds,
  canPrev,
  onPlay,
  onPause,
  onStop,
  onPrev,
}) => {
  const isPlaying = status === 'playing';
  const isPaused = status === 'paused';
  const canPlay = status === 'idle' || isPaused;
  const canPause = isPlaying;

  const buttonBase =
    'w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95';

  const phaseLabel =
    phase === 'waiting'
      ? 'Revelando...'
      : phase === 'revealing'
      ? 'Siguiente...'
      : 'Listo';

  const displaySeconds = remainingSeconds > 0 ? remainingSeconds : 0;

  return (
    <div className="justify-self-center w-full max-w-xl mt-4 px-2 sm:px-0">
      <div className="relative flex items-center justify-center gap-4 bg-gradient-to-r from-slate-50 to-slate-100/80 backdrop-blur-sm p-4 rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm">
        <button
          onClick={onPrev}
          disabled={!canPrev}
          className={`${buttonBase} ${
            canPrev
              ? 'bg-white text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50'
              : 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
          }`}
          aria-label="Tarjeta anterior"
          title="Tarjeta anterior"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
          </svg>
        </button>

        <button
          onClick={onStop}
          className={`${buttonBase} ${
            canPlay || canPause
              ? 'bg-rose-500 text-white shadow-md shadow-rose-200 hover:bg-rose-600'
              : 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
          }`}
          aria-label="Detener presentación"
          title="Detener presentación"
        >
          <svg
            className="w-5 h-5"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>

        <button
          onClick={canPause ? onPause : canPlay ? onPlay : undefined}
          disabled={!canPlay && !canPause}
          className={`${buttonBase} w-16 h-16 ${
            canPause
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700'
              : canPlay
              ? 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
              : 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
          }`}
          aria-label={canPause ? 'Pausar' : canPlay ? 'Reproducir' : 'Reproducir'}
        >
          {canPause ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {(isPlaying || isPaused) && (
          <div className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/90 rounded-full px-3 py-1.5 shadow-sm">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider ${
                phase === 'waiting'
                  ? 'text-amber-600'
                  : phase === 'revealing'
                  ? 'text-indigo-600'
                  : 'text-slate-400'
              }`}
            >
              {phaseLabel}
            </span>
            <span className="text-sm font-black tabular-nums text-slate-700">
              {displaySeconds}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
