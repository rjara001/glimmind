import React from 'react';

interface CardFeedbackProps {
  feedback: 'none' | 'correct' | 'incorrect';
  similarity: number | null;
  lastAttempt: string;
  isShaking: boolean;
}

export const CardFeedback: React.FC<CardFeedbackProps> = ({
  feedback,
  similarity,
  lastAttempt,
  isShaking,
}) => {
  const showLastAttempt = Boolean(lastAttempt && feedback !== 'none');

  if (feedback === 'none' && !showLastAttempt) {
    return null;
  }

  const bgClass = feedback === 'correct' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200';
  const textClass = feedback === 'correct' ? 'text-emerald-600' : 'text-rose-600';

  return (
    <div className={`rounded-2xl border px-4 py-3 ${bgClass}`}>
      {showLastAttempt && (
        <div className="mb-2">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Tu respuesta</span>
          <p className="text-xl font-medium text-slate-500 line-through">
            {lastAttempt}
          </p>
        </div>
      )}
      {feedback !== 'none' && (
        <>
          <p className={`text-[10px] font-black uppercase tracking-widest ${textClass}`}>
            {feedback === 'correct' ? '✓ Correcto' : '✗ Incorrecto'}
          </p>
          {similarity !== null && (
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Similitud: {similarity}%</p>
          )}
        </>
      )}
    </div>
  );
};
