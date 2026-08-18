import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { CardLevel } from '../types/activity';
import { LEVEL_LABELS } from '../utils/activity';
import { HistoryEmptyState } from './HistoryEmptyState';

interface GameSummaryViewProps {
  onGoToSettings: () => void;
}

const LEVEL_COLORS: Record<CardLevel, string> = {
  nuevas: 'bg-slate-100 text-slate-600',
  vistas: 'bg-sky-100 text-sky-700',
  reconocidas: 'bg-indigo-100 text-indigo-700',
  conocidas: 'bg-amber-100 text-amber-700',
  aprendidas: 'bg-emerald-100 text-emerald-700',
};

function formatDate(at: number): string {
  const date = new Date(at);
  const day = date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const time = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  return `${day} · ${time}`;
}

export const GameSummaryView: React.FC<GameSummaryViewProps> = ({ onGoToSettings }) => {
  const enabled = useGameStore((state) => state.settings.activityHistoryEnabled);
  const sessions = useGameStore((state) => state.sessions);
  const loading = useGameStore((state) => state.sessionsLoading);
  const loadSessions = useGameStore((state) => state.loadSessions);

  useEffect(() => {
    if (enabled) {
      loadSessions();
    }
  }, [enabled, loadSessions]);

  if (!enabled) {
    return (
      <HistoryEmptyState
        title="Resumen de juegos desactivado"
        description="Activa el registro de historial en Configuración para guardar el resumen de tus sesiones de juego."
        onGoToSettings={onGoToSettings}
      />
    );
  }

  if (loading && sessions.length === 0) {
    return <div className="text-center py-16 text-gray-400">Cargando...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Sin sesiones</h3>
        <p className="text-gray-500 mt-2">Juega una partida con el historial activo para ver sus resúmenes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessions.map((session) => (
        <div key={session.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <p className="font-bold text-gray-900">{session.listName || 'Lista'}</p>
              <p className="text-xs text-gray-400">{formatDate(session.endedAt)}</p>
            </div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full self-start">
              {session.cardsPlayed} tarjetas
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <span className="font-medium text-emerald-600">Correctas: {session.correct}</span>
            <span className="font-medium text-rose-600">Incorrectas: {session.incorrect}</span>
          </div>
          {Object.values(session.byLevel).some((count) => count > 0) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.entries(session.byLevel) as [CardLevel, number][]).map(([level, count]) =>
                count > 0 ? (
                  <span key={level} className={`text-xs font-bold px-2 py-1 rounded-full ${LEVEL_COLORS[level]}`}>
                    {LEVEL_LABELS[level]}: {count}
                  </span>
                ) : null,
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
