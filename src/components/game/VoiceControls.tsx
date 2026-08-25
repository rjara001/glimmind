import React from 'react';
import { GameVoicePhase } from '../../hooks/voice/useGameVoice';

interface VoiceControlsProps {
  phase: GameVoicePhase;
  isVoiceActive: boolean;
  onStop: () => void;
  onRepeat: () => void;
  onToggleListening: () => void;
}

export const VoiceControls: React.FC<VoiceControlsProps> = ({
  phase,
  isVoiceActive,
  onStop,
  onRepeat,
  onToggleListening,
}) => {
  const isActive = phase === 'speaking' || phase === 'listening' || phase === 'evaluating';
  const canRepeat = phase !== 'evaluating' && phase !== 'speaking';

  const buttonBase = "w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95";

  return (
    <div className="justify-self-center w-full max-w-xl mt-4 px-2 sm:px-0">
      <div className="relative flex items-center justify-center gap-4 bg-gradient-to-r from-slate-50 to-slate-100/80 backdrop-blur-sm p-4 rounded-2xl sm:rounded-3xl border border-slate-200/60 shadow-sm">
        {/* Stop button - turns off voice mode completely */}
        <button
          onClick={onStop}
          disabled={!isActive}
          className={`${buttonBase} ${
            isActive
              ? 'bg-rose-500 text-white shadow-md shadow-rose-200 hover:bg-rose-600'
              : 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
          }`}
          aria-label="Apagar modo voz"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>

        {/* Play/Pause toggle - controls voice mode on/off */}
        <button
          onClick={onToggleListening}
          disabled={phase === 'evaluating'}
          className={`${buttonBase} w-16 h-16 ${
            isVoiceActive
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700'
              : phase === 'evaluating'
              ? 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
          }`}
          aria-label={isVoiceActive ? 'Pausar' : 'Iniciar'}
        >
          {isVoiceActive ? (
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

        {/* Repeat button - replays the current word */}
        <button
          onClick={onRepeat}
          disabled={!canRepeat}
          className={`${buttonBase} ${
            canRepeat
              ? 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-indigo-600'
              : 'bg-slate-200/50 text-slate-400 cursor-not-allowed'
          }`}
          aria-label="Repetir palabra"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>

        {/* Phase indicator */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            phase === 'listening' ? 'text-indigo-600' :
            phase === 'speaking' ? 'text-amber-600' :
            phase === 'evaluating' ? 'text-slate-500' :
            phase === 'feedback' ? 'text-emerald-600' :
            'text-slate-400'
          }`}>
            {phase === 'listening' ? 'Escuchando...' :
             phase === 'speaking' ? 'Hablando...' :
             phase === 'evaluating' ? 'Evaluando...' :
             phase === 'feedback' ? 'Feedback' :
             'Listo'}
          </span>
        </div>
      </div>
    </div>
  );
};
