import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { rankByPlays, rankByWeakness, CardContext } from '../../utils/ranking';
import { CardLevel } from '../../types/activity';
import { LEVEL_LABELS } from '../../utils/activity';
import { HistoryEmptyState } from '../HistoryEmptyState';

interface RankingViewProps {
  onGoToSettings: () => void;
}

type RankTab = 'plays' | 'weakness';

const LEVEL_COLORS: Record<CardLevel, string> = {
  nuevas: 'bg-slate-100 text-slate-600',
  vistas: 'bg-sky-100 text-sky-700',
  reconocidas: 'bg-indigo-100 text-indigo-700',
  conocidas: 'bg-amber-100 text-amber-700',
  aprendidas: 'bg-emerald-100 text-emerald-700',
};

export const RankingView: React.FC<RankingViewProps> = ({ onGoToSettings }) => {
  const enabled = useGameStore((state) => state.settings.activityHistoryEnabled);
  const lists = useGameStore((state) => state.lists);
  const [tab, setTab] = useState<RankTab>('plays');

  const contexts = useMemo<CardContext[]>(() => {
    const result: CardContext[] = [];
    for (const list of lists) {
      for (const association of list.associations) {
        if (association.isArchived) continue;
        result.push({ association, listId: list.id, listName: list.name });
      }
    }
    return result;
  }, [lists]);

  const ranked = useMemo(
    () => (tab === 'plays' ? rankByPlays(contexts) : rankByWeakness(contexts)),
    [tab, contexts],
  );

  if (!enabled) {
    return (
      <HistoryEmptyState
        title="Ranking desactivado"
        description="Activa el registro de historial en Configuración para ver el ranking de tus tarjetas más jugadas y menos acertadas."
        onGoToSettings={onGoToSettings}
      />
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('plays')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
            tab === 'plays' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:text-indigo-600'
          }`}
        >
          Más jugadas
        </button>
        <button
          onClick={() => setTab('weakness')}
          className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
            tab === 'weakness' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:text-indigo-600'
          }`}
        >
          Menos correctas
        </button>
      </div>

      {ranked.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Sin datos</h3>
          <p className="text-gray-500 mt-2">Juega partidas con el historial activo para generar el ranking.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 font-black border-b bg-white">
                <th className="px-6 py-3">#</th>
                <th className="px-6 py-3">Tarjeta</th>
                <th className="px-6 py-3">Lista</th>
                <th className="px-6 py-3 text-right">Jugadas</th>
                <th className="px-6 py-3 text-right">Correctas</th>
                <th className="px-6 py-3 text-right">Precisión</th>
                <th className="px-6 py-3">Nivel</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {ranked.map((card, index) => (
                <tr key={card.association.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3 text-slate-400 font-bold">{index + 1}</td>
                  <td className="px-6 py-3 font-semibold text-gray-900">{card.association.term}</td>
                  <td className="px-6 py-3 text-sm text-gray-500">{card.listName}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium">{card.timesPlayed}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium text-emerald-600">{card.hits}</td>
                  <td className="px-6 py-3 text-right text-sm font-medium">{card.accuracy}%</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${LEVEL_COLORS[card.level]}`}>
                      {LEVEL_LABELS[card.level]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
