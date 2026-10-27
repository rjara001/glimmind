import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../i18n';
import { useGameStore } from '../../store/gameStore';
import { CardActivityEvent, CardActivityType } from '../../types/activity';
import { LEVEL_LABELS } from '../../utils/activity';

interface HistoryViewProps {
  onBack: () => void;
  onGoToSettings: () => void;
}

type ActivityTypeLabelKey =
  | 'dashboard.tipo_tarjeta_creada'
  | 'dashboard.tipo_tarjeta_editada'
  | 'dashboard.tipo_tarjeta_archivada'
  | 'dashboard.tipo_tarjeta_restaurada'
  | 'dashboard.tipo_tarjeta_eliminada'
  | 'dashboard.tipo_tarjeta_movida'
  | 'dashboard.tipo_tarjeta_revelada'
  | 'dashboard.tipo_respuesta'
  | 'dashboard.tipo_nivel_alcanzado';

const TYPE_LABELS: Record<CardActivityType, ActivityTypeLabelKey> = {
  card_created: 'dashboard.tipo_tarjeta_creada',
  card_updated: 'dashboard.tipo_tarjeta_editada',
  card_archived: 'dashboard.tipo_tarjeta_archivada',
  card_restored: 'dashboard.tipo_tarjeta_restaurada',
  card_deleted: 'dashboard.tipo_tarjeta_eliminada',
  card_moved: 'dashboard.tipo_tarjeta_movida',
  card_revealed: 'dashboard.tipo_tarjeta_revelada',
  card_answered: 'dashboard.tipo_respuesta',
  card_level_up: 'dashboard.tipo_nivel_alcanzado',
};

const TYPE_COLORS: Record<CardActivityType, string> = {
  card_created: 'bg-emerald-100 text-emerald-700',
  card_updated: 'bg-amber-100 text-amber-700',
  card_archived: 'bg-slate-100 text-slate-600',
  card_restored: 'bg-sky-100 text-sky-700',
  card_deleted: 'bg-rose-100 text-rose-700',
  card_moved: 'bg-indigo-100 text-indigo-700',
  card_revealed: 'bg-purple-100 text-purple-700',
  card_answered: 'bg-blue-100 text-blue-700',
  card_level_up: 'bg-emerald-100 text-emerald-700',
};

function eventDescription(event: CardActivityEvent): string {
  switch (event.type) {
    case 'card_answered':
      return `${i18n.t(event.correct ? 'dashboard.correcta' : 'dashboard.incorrecta')}: ${event.cardTerm}`;
    case 'card_updated':
      return i18n.t('dashboard.evento_valor', {
        value: event.field === 'term' ? '1' : '2',
        term: event.cardTerm,
        before: event.before,
        after: event.after,
      });
    case 'card_level_up':
      return `${event.cardTerm} → ${event.toLevel ? LEVEL_LABELS[event.toLevel] : i18n.t('dashboard.nivel_superior')}`;
    case 'card_moved':
      return `${event.cardTerm} → ${i18n.t('dashboard.otra_lista')}`;
    default:
      return event.cardTerm;
  }
}

function formatTime(at: number): string {
  return new Date(at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

interface DayGroup {
  key: string;
  label: string;
  events: CardActivityEvent[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ onBack, onGoToSettings }) => {
  const { t } = useTranslation();
  const enabled = useGameStore((state) => state.settings.activityHistoryEnabled);
  const activity = useGameStore((state) => state.activity);
  const nextCursor = useGameStore((state) => state.activityNextCursor);
  const loading = useGameStore((state) => state.activityLoading);
  const loadActivity = useGameStore((state) => state.loadActivity);
  const lists = useGameStore((state) => state.lists);
  const [typeFilter, setTypeFilter] = useState<CardActivityType | 'all'>('all');
  const [listFilter, setListFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (enabled) {
      loadActivity();
    }
  }, [enabled, loadActivity]);

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return activity.filter(
      (event) =>
        (typeFilter === 'all' || event.type === typeFilter) &&
        (listFilter === 'all' || event.listId === listFilter) &&
        (query === '' || event.cardTerm.toLowerCase().includes(query)),
    );
  }, [activity, typeFilter, listFilter, searchTerm]);

  const dayGroups = useMemo(() => {
    const groups: DayGroup[] = [];
    for (const event of filtered) {
      const date = new Date(event.at);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const label = date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.events.push(event);
      } else {
        groups.push({ key, label, events: [event] });
      }
    }
    return groups;
  }, [filtered]);

  const handleLoadMore = () => {
    if (nextCursor) {
      loadActivity({ cursor: nextCursor });
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          aria-label={t('dashboard.volver')}
          className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('dashboard.actividad')}</h2>
          <p className="text-sm text-gray-500">{t('dashboard.historial_de_eventos_de_tus_tarjetas')}</p>
        </div>
      </div>

      {!enabled ? (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.historial_desactivado')}</h3>
          <p className="text-gray-500 mt-2">{t('dashboard.activa_el_registro_de_historial_en_configu')}</p>
          <button
            onClick={onGoToSettings}
            className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            {t('dashboard.ir_a_configuracion')}
          </button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex flex-col sm:flex-row gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as CardActivityType | 'all')}
              className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
              aria-label={t('dashboard.filtrar_por_tipo')}
            >
              <option value="all">{t('dashboard.todos_los_tipos')}</option>
              {Object.entries(TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{t(label)}</option>
              ))}
            </select>
            <select
              value={listFilter}
              onChange={(e) => setListFilter(e.target.value)}
              className="px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
              aria-label={t('dashboard.filtrar_por_lista')}
            >
              <option value="all">{t('dashboard.todas_las_listas')}</option>
              {lists.map((list) => (
                <option key={list.id} value={list.id}>{list.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('dashboard.buscar_tarjeta')}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
              aria-label={t('dashboard.buscar_tarjeta_label')}
            />
          </div>

          {dayGroups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">{t('dashboard.sin_actividad')}</h3>
              <p className="text-gray-500 mt-2">{t('dashboard.aun_no_hay_eventos_registrados_para_estos_')}</p>
            </div>
          ) : (
            <div className="space-y-8">
              {dayGroups.map((group) => (
                <div key={group.key}>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 capitalize">{group.label}</h3>
                  <div className="space-y-2">
                    {group.events.map((event) => (
                      <div key={event.id} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex items-start gap-3">
                        <span className={`text-xs font-bold px-2 py-1 rounded-full flex-shrink-0 ${TYPE_COLORS[event.type]}`}>
                          {TYPE_LABELS[event.type]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 break-words">{eventDescription(event)}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{formatTime(event.at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {nextCursor && (
            <div className="mt-8 text-center">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-indigo-700 transition shadow-sm disabled:opacity-50 disabled:cursor-wait"
              >
                {loading ? 'Cargando...' : 'Cargar más'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
