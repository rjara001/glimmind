import React from 'react';
import { BigListCardProps } from '../../types/big-list-card-props';
import { StateBreakdown } from '../../types/progress';
import { MILESTONE_THRESHOLDS, nextMilestoneThreshold } from '../../utils/progress';

const STATE_SEGMENTS: { key: keyof StateBreakdown; colorClass: string; label: string }[] = [
  { key: 'nuevas', colorClass: 'bg-slate-400', label: 'Nuevas' },
  { key: 'vistas', colorClass: 'bg-sky-500', label: 'Vistas' },
  { key: 'reconocidas', colorClass: 'bg-yellow-400', label: 'Reconocidas' },
  { key: 'conocidas', colorClass: 'bg-rose-500', label: 'Conocidas' },
  { key: 'aprendidas', colorClass: 'bg-emerald-500', label: 'Aprendidas' },
];

export const BigListCard: React.FC<BigListCardProps> = ({ list, breakdown, milestones, onPlay, onEdit, onDelete }) => {
  const total = breakdown.nuevas + breakdown.vistas + breakdown.reconocidas + breakdown.conocidas + breakdown.aprendidas;
  const learned = breakdown.aprendidas;
  const percent = total > 0 ? Math.round((learned / total) * 100) : 0;
  const nextMilestone = nextMilestoneThreshold(milestones, percent);
  const nextProgress = nextMilestone !== null ? Math.min(100, Math.round((percent / nextMilestone) * 100)) : 100;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition group">
      <div className="flex justify-between items-start mb-4">
        <span className="bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
          {list.concept}
        </span>
        <button onClick={() => onDelete(list.id)} className="text-gray-400 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">{list.name}</h3>
      <p className="text-gray-500 text-sm mb-4">
        {total} pairs · <span className="font-bold text-gray-700">{percent}% dominado</span>
      </p>

      <div className="flex h-2.5 rounded-full overflow-hidden bg-slate-100 mb-2">
        {STATE_SEGMENTS.map((segment) => (
          <div
            key={segment.key}
            className={segment.colorClass}
            style={{ width: total > 0 ? `${(breakdown[segment.key] / total) * 100}%` : '0%' }}
            title={`${segment.label}: ${breakdown[segment.key]}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
        {STATE_SEGMENTS.map((segment) => (
          <span key={segment.key} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <span className={`w-2 h-2 rounded-full ${segment.colorClass}`} />
            {segment.label}: {breakdown[segment.key]}
          </span>
        ))}
      </div>

      <div className="mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-slate-500">Hitos</span>
          {nextMilestone !== null ? (
            <span className="text-xs font-bold text-indigo-600">Próximo: {nextMilestone}%</span>
          ) : (
            <span className="text-xs font-bold text-emerald-600">¡Lista dominada al 100%!</span>
          )}
        </div>
        <div className="flex gap-1.5 mb-2">
          {MILESTONE_THRESHOLDS.map((threshold) => {
            const reached = milestones.includes(threshold);
            const isNext = nextMilestone === threshold;
            return (
              <span
                key={threshold}
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  reached
                    ? 'bg-emerald-100 text-emerald-700'
                    : isNext
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {reached ? `✓ ${threshold}%` : `${threshold}%`}
              </span>
            );
          })}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${nextMilestone !== null ? 'bg-indigo-500' : 'bg-emerald-500'}`}
            style={{ width: `${nextProgress}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={() => onPlay(list.id)} disabled={total === 0} className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition">
          Study
        </button>
        <button onClick={() => onEdit(list.id)} className="px-4 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition">
          Edit
        </button>
      </div>
    </div>
  );
};
