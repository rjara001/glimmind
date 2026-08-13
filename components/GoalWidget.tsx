import React from 'react';
import { GoalWidgetProps } from '../types/goal-widget-props';
import { StateBreakdown } from '../types/progress';
import { todayKey, emptyDailyProgress } from '../utils/progress';

const GOAL_PRESETS = [30, 50, 100];

const STATE_ITEMS: { key: keyof StateBreakdown; label: string; dotClass: string }[] = [
  { key: 'nuevas', label: 'Nuevas', dotClass: 'bg-slate-400' },
  { key: 'vistas', label: 'Vistas', dotClass: 'bg-sky-500' },
  { key: 'reconocidas', label: 'Reconocidas', dotClass: 'bg-yellow-400' },
  { key: 'conocidas', label: 'Conocidas', dotClass: 'bg-rose-500' },
  { key: 'aprendidas', label: 'Aprendidas', dotClass: 'bg-emerald-500' },
];

const RING_RADIUS = 40;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export const GoalWidget: React.FC<GoalWidgetProps> = ({ progress, onSetTarget }) => {
  const goalProgress = Math.min(progress.goalProgress, progress.goalTarget);
  const percent = progress.goalTarget > 0 ? Math.round((goalProgress / progress.goalTarget) * 100) : 0;
  const ringOffset = RING_CIRCUMFERENCE - (percent / 100) * RING_CIRCUMFERENCE;
  const today = progress.log[todayKey()] || emptyDailyProgress();

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex flex-col lg:flex-row items-center gap-6">
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28">
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={RING_RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r={RING_RADIUS}
                fill="none"
                stroke="#6366f1"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-black text-slate-900">{goalProgress}/{progress.goalTarget}</span>
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">repasos</span>
            </div>
          </div>
          <h3 className="text-sm font-bold text-slate-800 mt-3">Meta diaria</h3>
        </div>

        <div className="flex-1 w-full">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-orange-600 text-sm font-bold px-3 py-1.5 rounded-xl">
              🔥 Racha: {progress.streak} {progress.streak === 1 ? 'día' : 'días'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Iniciada el {progress.goalStartedAt}
            </span>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">Hoy por estado</p>
            <div className="flex flex-wrap gap-2">
              {STATE_ITEMS.map((item) => (
                <span key={item.key} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-100 text-xs font-semibold text-slate-600 px-2.5 py-1 rounded-lg">
                  <span className={`w-2 h-2 rounded-full ${item.dotClass}`} />
                  {item.label}: {today.byState[item.key]}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-40">
          <p className="text-xs font-semibold text-slate-500 mb-2">Cambiar meta</p>
          <div className="flex lg:flex-col gap-2">
            {GOAL_PRESETS.map((target) => {
              const isActive = progress.goalTarget === target;
              return (
                <button
                  key={target}
                  onClick={() => onSetTarget(target)}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold transition ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {target}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
