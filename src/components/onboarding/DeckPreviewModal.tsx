import React from 'react';
import { PrebuiltDeck } from '../../types/prebuilt-deck';

interface DeckPreviewModalProps {
  deck: PrebuiltDeck | null;
  onAdd: (deck: PrebuiltDeck) => void;
  onClose: () => void;
  isAdding: boolean;
}

export const DeckPreviewModal: React.FC<DeckPreviewModalProps> = ({ deck, onAdd, onClose, isAdding }) => {
  if (!deck) return null;

  return (
    <div
      className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 sm:p-8 bg-indigo-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl">
              {deck.icon}
            </div>
            <div>
              <h2 className="text-2xl font-black">{deck.name}</h2>
              <p className="text-indigo-100 font-medium text-sm">{deck.description}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-white/20 rounded-xl transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 sm:p-8 bg-slate-50 max-h-[50vh] overflow-y-auto">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
            {deck.associations.length} tarjetas · {deck.concept}
          </p>
          <div className="space-y-2">
            {deck.associations.map((pair, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-3 rounded-xl ${
                  index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                }`}
              >
                <span className="font-bold text-slate-800 text-sm">{pair.term}</span>
                <span className="text-slate-400 mx-3">→</span>
                <span className="text-slate-600 text-sm">{pair.definition}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 sm:p-8 bg-white border-t flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => onAdd(deck)}
            disabled={isAdding}
            className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none transition active:scale-95 flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Agregando...
              </>
            ) : (
              '🛒 Agregar esta baraja a mi espacio'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
