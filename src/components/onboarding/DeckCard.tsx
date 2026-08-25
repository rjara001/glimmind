import React from 'react';
import { PrebuiltDeck } from '../../types/prebuilt-deck';

interface DeckCardProps {
  deck: PrebuiltDeck;
  onPreview: (deck: PrebuiltDeck) => void;
  onAdd: (deck: PrebuiltDeck) => void;
  isAdding: boolean;
}

export const DeckCard: React.FC<DeckCardProps> = ({ deck, onPreview, onAdd, isAdding }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
          {deck.icon} {deck.category}
        </span>
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-1">{deck.name}</h3>
      <p className="text-sm text-gray-500 line-clamp-2 mb-2 flex-1">{deck.description}</p>
      <p className="text-xs text-slate-400 font-semibold mb-4">{deck.associations.length} tarjetas</p>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => onPreview(deck)}
          className="w-full py-2.5 border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition"
        >
          👁️ Previsualizar
        </button>
        <button
          onClick={() => onAdd(deck)}
          disabled={isAdding}
          className="w-full py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-indigo-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
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
            '🛒 Agregar a mi Espacio'
          )}
        </button>
      </div>
    </div>
  );
};
