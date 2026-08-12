import React, { useState } from 'react';
import { VoicePhase } from '../../hooks/useVoiceSession';

interface VoiceCardProps {
  displayWord: string;
  expectedAnswer: string;
  phase: VoicePhase;
  transcript: string;
  interim: string;
  error: string | null;
  isListening: boolean;
  onRepeat: () => void;
  onStop: () => void;
  onSubmitTyped: (text: string) => void;
}

export const VoiceCard: React.FC<VoiceCardProps> = ({
  displayWord,
  expectedAnswer,
  phase,
  transcript,
  interim,
  error,
  isListening,
  onRepeat,
  onStop,
  onSubmitTyped,
}) => {
  const [typedInput, setTypedInput] = useState('');
  const [showTypedFallback, setShowTypedFallback] = useState(false);

  const handleTypedSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!typedInput.trim()) return;
    onSubmitTyped(typedInput.trim());
    setTypedInput('');
    setShowTypedFallback(false);
  };

  const spokenText = transcript || interim;
  const isSpeaking = phase === 'speaking' && !isListening;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Palabra</p>
        <h2 className="text-4xl font-black text-slate-900 mb-6">{displayWord}</h2>

        <div className="mb-6 min-h-[1.5rem]">
          {isListening && (
            <p className="text-sm font-bold text-rose-600 animate-pulse">Escuchando…</p>
          )}
          {!isListening && isSpeaking && (
            <p className="text-sm font-bold text-indigo-600 animate-pulse">Hablando…</p>
          )}
          {!isListening && phase === 'evaluating' && (
            <p className="text-sm font-bold text-slate-500">Evaluando…</p>
          )}
        </div>

        {spokenText && (
          <div className="mb-4">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Tu respuesta</p>
            <p className="text-lg font-medium text-slate-700">"{spokenText}"</p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-800">{error}</p>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={onRepeat}
            disabled={isListening}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs disabled:opacity-50"
          >
            {isListening ? 'Escuchando…' : 'Repetir palabra'}
          </button>
          <button
            onClick={onStop}
            className="w-full bg-white text-slate-500 border border-slate-200 py-3 rounded-xl font-black uppercase text-xs"
          >
            Detener sesión
          </button>
          <button
            onClick={() => setShowTypedFallback((value) => !value)}
            className="w-full bg-white text-indigo-600 border border-indigo-100 py-3 rounded-xl font-black uppercase text-xs"
          >
            Escribir respuesta
          </button>
        </div>

        {showTypedFallback && (
          <form onSubmit={handleTypedSubmit} className="mt-4">
            <label className="block text-xs font-bold text-slate-500 mb-2">Escribí tu respuesta:</label>
            <input
              type="text"
              value={typedInput}
              onChange={(event) => setTypedInput(event.target.value)}
              autoFocus
              className="w-full border-2 border-indigo-100 rounded-xl px-4 py-3 text-lg font-bold text-center"
              placeholder={expectedAnswer}
            />
            <button type="submit" className="mt-3 w-full bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs">
              Validar
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
