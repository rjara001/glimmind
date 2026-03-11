
import React from 'react';

interface FinishedScreenProps {
  onRestart: () => void;
  onBack: () => void;
}

export const FinishedScreen: React.FC<FinishedScreenProps> = ({ onRestart, onBack }) => {
  return (
    <div className="max-w-md mx-auto mt-20 p-10 bg-white rounded-[3rem] shadow-2xl text-center border border-slate-100 animate-in zoom-in-95 duration-500">
      <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-2">¡Sesión Lista!</h2>
      <p className="text-slate-500 mb-8 font-medium">Has fortalecido todas las conexiones de esta lista.</p>
      <div className="flex flex-col gap-3">
        <button onClick={onRestart} className="bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition">Reiniciar Aprendizaje</button>
        <button onClick={onBack} className="text-slate-400 font-bold py-2 hover:text-indigo-600 transition text-sm">Regresar al Panel</button>
      </div>
    </div>
  );
};
