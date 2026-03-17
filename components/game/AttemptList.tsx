import React from 'react';
import { Attempt } from '../../types';

interface AttemptListProps {
  attempts: Attempt[];
}

export const AttemptList: React.FC<AttemptListProps> = ({ attempts }) => {
  if (attempts.length === 0) {
    return null;
  }

  const reversedAttempts = [...attempts].reverse();

  return (
    <div className="w-full bg-white/40 rounded-2xl p-4 border border-white mt-4">
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Intentos ({attempts.length})</h3>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
        {reversedAttempts.map((attempt) => (
          <div 
            key={attempt.timestamp} 
            className="bg-white/60 rounded-xl p-3 border border-slate-100 shadow-sm"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">
                  "{attempt.userInput}"
                </p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Esperado: <span className="text-slate-600">{attempt.expectedAnswer}</span>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`text-sm font-bold ${attempt.similarity >= attempt.threshold ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {attempt.similarity}%
                </span>
                <span className="text-[10px] text-slate-400">
                  umbral: {Math.round(attempt.threshold)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
