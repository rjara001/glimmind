import React from 'react';
import { GameVoicePhase } from '../../hooks/voice/useGameVoice';

interface CardVoiceIndicatorProps {
  voiceMode: boolean;
  voicePhase?: GameVoicePhase;
  voiceTranscript?: string;
  voiceInterim?: string;
  isVoiceListening?: boolean;
  voiceError?: string | null;
  feedback: 'none' | 'correct' | 'incorrect';
  similarity: number | null;
}

export const CardVoiceIndicator: React.FC<CardVoiceIndicatorProps> = ({
  voiceMode,
  voicePhase,
  voiceTranscript,
  voiceInterim,
  isVoiceListening,
  voiceError,
  feedback,
  similarity,
}) => {
  if (!voiceMode) {
    return null;
  }

  return (
    <div className="w-full max-w-md mx-auto mt-3 space-y-2">
      {voicePhase === 'speaking' && (
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest animate-pulse">Hablando…</p>
      )}
      {voicePhase === 'listening' && (
        <div className="flex flex-col items-center gap-1">
          <p className={`text-[10px] font-black uppercase tracking-widest animate-pulse ${isVoiceListening ? 'text-rose-500' : 'text-indigo-500'}`}>
            {isVoiceListening ? 'Escuchando…' : 'Procesando…'}
          </p>
          {(voiceInterim || voiceTranscript) && (
            <p className="text-sm font-bold text-slate-600">“{voiceInterim || voiceTranscript}”</p>
          )}
        </div>
      )}
      {voicePhase === 'evaluating' && (
        <div className="flex flex-col items-center gap-1">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Evaluando…</p>
          {voiceTranscript && (
            <p className="text-sm font-bold text-slate-600">“{voiceTranscript}”</p>
          )}
        </div>
      )}
      {voicePhase === 'feedback' && (
        <div className={`rounded-2xl border px-4 py-3`}>
          <p className={`text-[10px] font-black uppercase tracking-widest`}>
            {feedback === 'correct' ? '✓ Correcto' : '✗ Incorrecto'}
          </p>
          {voiceTranscript && (
            <p className="text-sm font-bold text-slate-700 mt-1">Dijiste: “{voiceTranscript}”</p>
          )}
          {similarity !== null && (
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Similitud: {similarity}%</p>
          )}
        </div>
      )}
      {voiceError && (
        <p className="text-[10px] font-bold text-rose-600">{voiceError}</p>
      )}
    </div>
  );
};
