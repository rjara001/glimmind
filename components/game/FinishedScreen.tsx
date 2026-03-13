
import React from 'react';
import { GameSummary } from '../../types';

interface FinishedScreenProps {
  summary: GameSummary | null;
  onRestart: () => void;
  onBack: () => void;
  onArchive: () => void; // New prop for archiving learned cards
}

export const FinishedScreen: React.FC<FinishedScreenProps> = ({ summary, onRestart, onBack, onArchive }) => {

  const summaryItems = summary ? [
    { label: 'Vistas', value: summary.seen, className: 'text-slate-500' },
    { label: 'Reconocidas', value: summary.recognized, className: 'text-sky-600' },
    { label: 'Conocidas', value: summary.known, className: 'text-indigo-600' },
    { label: 'Aprendidas', value: summary.learned, className: 'text-emerald-600' },
  ] : [];

  const hasLearnedCards = summary && summary.learned > 0;

  return (
    <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2">¡Sesión Lista!</h2>
      <p className="text-slate-500 mb-6 font-medium">Este es tu progreso en esta sesión:</p>
      
      {summary && (
        <div className="mb-8 text-center">
          <ul className="inline-block text-left">
            {summaryItems.map(item => (
              item.value > 0 && (
                <li key={item.label} className="flex items-baseline gap-4 py-1">
                  <span className={`text-2xl font-black ${item.className}`}>{item.value}</span>
                  <span className="font-bold text-slate-600 text-lg">{item.label}</span>
                </li>
              )
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {hasLearnedCards ? (
          <>
            <button 
              onClick={onArchive}
              className="bg-emerald-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition"
            >
              Archivar Aprendidas y Reiniciar
            </button>
            <button 
              onClick={onRestart}
              className="text-slate-400 font-bold py-2 hover:text-indigo-600 transition text-sm"
            >
              Reiniciar sin Archivar
            </button>
          </>
        ) : (
          <button 
            onClick={onRestart} 
            className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition"
          >
            Reiniciar Aprendizaje
          </button>
        )}
        
        <button onClick={onBack} className="text-slate-400 font-bold py-2 hover:text-indigo-600 transition text-sm mt-2">
          Regresar al Panel
        </button>
      </div>
    </div>
  );
};
