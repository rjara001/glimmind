import React, { useState, useMemo, useEffect } from 'react';
import { AssociationList, Association } from '../types';
import { ListRecommendation } from '../types/recommendation';
import { normalizeText } from '../utils/text';
import { recommendListsFor } from '../utils/recommendList';

interface QuickAddModalProps {
  lists: AssociationList[];
  onAdd: (listId: string, term: string, definition: string) => void;
  onClose: () => void;
}

interface SearchMatch {
  association: Association;
  list: AssociationList;
}

interface ExistingMatch {
  term: string;
  definition: string;
  list: AssociationList;
}

export const QuickAddModal: React.FC<QuickAddModalProps> = ({ lists, onAdd, onClose }) => {
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newDefinition, setNewDefinition] = useState('');
  const [existingMatch, setExistingMatch] = useState<ExistingMatch | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  const searchResults: SearchMatch[] = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];
    return lists
      .flatMap((list) => {
        const active = (list.associations || []).filter((a) => !a.isArchived);
        return active
          .filter(
            (a) =>
              normalizeText(a.term).includes(normalizedQuery) ||
              normalizeText(a.definition).includes(normalizedQuery),
          )
          .map((association) => ({ association, list }));
      })
      .slice(0, 8);
  }, [lists, query]);

  const recommendations: ListRecommendation[] = useMemo(() => {
    if (!isCreating) return [];
    return recommendListsFor(newTerm, newDefinition, lists);
  }, [isCreating, newTerm, newDefinition, lists]);

  useEffect(() => {
    if (!recommendations.length) return;
    if (!selectedListId || !recommendations.some((r) => r.list.id === selectedListId)) {
      setSelectedListId(recommendations[0].list.id);
    }
  }, [recommendations, selectedListId]);

  const handleSelectResult = (match: SearchMatch) => {
    setQuery('');
    setExistingMatch({
      term: match.association.term,
      definition: match.association.definition,
      list: match.list,
    });
    setNewTerm(match.association.term);
    setNewDefinition(match.association.definition);
    setSelectedListId(match.list.id);
    setIsCreating(true);
  };

  const handleStartCreating = () => {
    setExistingMatch(null);
    setIsCreating(true);
  };

  const handleSubmit = () => {
    if (!newTerm.trim() || !newDefinition.trim() || !selectedListId) return;
    onAdd(selectedListId, newTerm.trim(), newDefinition.trim());
    onClose();
  };

  const maxScore = recommendations.length > 0 ? recommendations[0].score : 1;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 bg-indigo-600 text-white">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <h2 className="text-2xl font-black">Agregar Valor</h2>
          </div>
          <p className="text-indigo-100 font-medium">Busca si ya existe o crea un nuevo valor en la mejor lista.</p>
        </div>

        <div className="p-8 max-h-[60vh] overflow-y-auto bg-slate-50" style={{ scrollbarWidth: 'none' }}>
          {!isCreating ? (
            <div>
              <label htmlFor="quick-add-search" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Buscar valor</label>
              <input
                id="quick-add-search"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Escribe un valor o su definición..."
                autoFocus
                className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-base font-medium text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 outline-none transition"
              />

              {searchResults.length > 0 && (
                <ul className="mt-4 bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                  {searchResults.map(({ association, list }) => (
                    <li key={association.id}>
                      <button
                        onClick={() => handleSelectResult({ association, list })}
                        className="w-full text-left px-5 py-3 hover:bg-indigo-50/50 transition flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 truncate">{association.term}</p>
                          <p className="text-sm text-slate-500 truncate">{association.definition}</p>
                        </div>
                        <span className="shrink-0 bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-lg">{list.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {searchResults.length === 0 && normalizeText(query) && (
                <p className="mt-4 text-sm text-slate-400">Sin resultados. Puedes crear este valor a continuación.</p>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleStartCreating}
                  className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition active:scale-95"
                >
                  No lo encuentro, crear nuevo
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div>
              {existingMatch && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-sm text-amber-800 font-medium">
                    Ya existe en la lista <span className="font-black">"{existingMatch.list.name}"</span>: {existingMatch.term} → {existingMatch.definition}. Puedes crearlo igual en otra lista.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label htmlFor="quick-add-term" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Valor</label>
                  <input
                    id="quick-add-term"
                    type="text"
                    value={newTerm}
                    onChange={(e) => setNewTerm(e.target.value)}
                    placeholder="ej: go"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-base font-bold text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
                <div>
                  <label htmlFor="quick-add-definition" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Esperado</label>
                  <input
                    id="quick-add-definition"
                    type="text"
                    value={newDefinition}
                    onChange={(e) => setNewDefinition(e.target.value)}
                    placeholder="ej: ir"
                    className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3 text-base font-medium text-slate-800 placeholder-slate-300 focus:ring-4 focus:ring-indigo-100 outline-none transition"
                  />
                </div>
              </div>

              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Lista sugerida</p>
              {recommendations.length === 0 && (
                <p className="text-sm text-slate-400 mb-4">No hay listas disponibles para sugerir.</p>
              )}
              <ul className="space-y-3 mb-6">
                {recommendations.slice(0, 3).map(({ list, score, reasons }) => (
                  <li key={list.id}>
                    <button
                      onClick={() => setSelectedListId(list.id)}
                      className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                        selectedListId === list.id
                          ? 'border-indigo-600 bg-white shadow-md'
                          : 'border-slate-200 bg-white opacity-70 hover:opacity-100'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-slate-800">{list.name}</span>
                        <span className="text-xs font-bold text-slate-400">{list.concept}</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
                          style={{ width: `${Math.max(4, (score / maxScore) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">{reasons.join(' · ') || 'Sin coincidencias, distribuido por carga'}</p>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={!newTerm.trim() || !newDefinition.trim() || !selectedListId}
                  className="flex-[2] bg-indigo-600 text-white py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none transition active:scale-95"
                >
                  Agregar valor
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 text-slate-400 font-black uppercase text-xs tracking-widest hover:text-slate-600 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
