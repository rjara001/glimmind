import React, { useState, useMemo } from 'react';
import { computeStateBreakdown } from '../../utils/progress';
import { CYCLE_LABELS, CYCLE_COLORS } from '../../utils/cycle-colors';
import { CYCLE_RULE_CHIPS } from '../../utils/cycle-rules';
import { CycleMiniBar } from './CycleMiniBar';
import type { CycleProgressProps } from '../../types/cycle-progress-props';

interface StageBox {
  key: string;
  label: string;
  count: number;
  colorGroup: 'nueva' | 'vista' | 'reconocida' | 'frecuente' | 'aprendida';
  isActive: boolean;
}

const APRENDIDA_BG = 'bg-[#e3f3e3]';
const APRENDIDA_BORDER = 'border-[#b8d9b8]';
const APRENDIDA_TEXT = 'text-[#1a4a1a]';

function getStateColors(colorGroup: StageBox['colorGroup']): { bg: string; border: string } {
  if (colorGroup === 'aprendida') {
    return { bg: APRENDIDA_BG, border: APRENDIDA_BORDER };
  }
  const palette = CYCLE_COLORS[colorGroup];
  return { bg: `bg-[${palette.bg}]`, border: `border-[${palette.border}]` };
}

export const CycleProgress: React.FC<CycleProgressProps> = ({
  gameState,
  learnedCountRef,
  cycleMiniStats,
  isMobile = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const breakdown = useMemo(
    () => computeStateBreakdown(gameState.associations),
    [gameState.associations]
  );

  const totalAssociations = gameState.associations.filter((a) => !a.isArchived).length;
  const activeCycle = gameState.globalCycle;
  const cyclePendientes = breakdown[
    activeCycle === 1 ? 'nuevas' :
    activeCycle === 2 ? 'vistas' :
    activeCycle === 3 ? 'reconocidas' : 'frecuentes'
  ];

  const progressPercentage = totalAssociations > 0
    ? Math.round((breakdown.aprendidas / totalAssociations) * 100)
    : 0;

  const stageBoxes: StageBox[] = [
    {
      key: 'nueva',
      label: CYCLE_LABELS[1],
      count: breakdown.nuevas,
      colorGroup: 'nueva',
      isActive: activeCycle === 1,
    },
    {
      key: 'vista',
      label: CYCLE_LABELS[2],
      count: breakdown.vistas,
      colorGroup: 'vista',
      isActive: activeCycle === 2,
    },
    {
      key: 'reconocida',
      label: CYCLE_LABELS[3],
      count: breakdown.reconocidas,
      colorGroup: 'reconocida',
      isActive: activeCycle === 3,
    },
    {
      key: 'frecuente',
      label: CYCLE_LABELS[4],
      count: breakdown.frecuentes,
      colorGroup: 'frecuente',
      isActive: activeCycle === 4,
    },
  ];

  if (!isMobile) {
    return (
      <div
        className="flex items-stretch transition-all duration-300 rounded-[2rem] shadow-xl border border-black/[0.02] overflow-hidden min-h-[320px] max-w-[900px]"
        style={{ direction: 'rtl' }}
      >
        <div
          id="cycle-progress-details"
          className={`overflow-hidden transition-all duration-400 ease-in-out bg-white ${
            isExpanded ? 'max-w-[700px] opacity-100 p-5 pr-6' : 'max-w-0 opacity-0 p-0'
          }`}
          style={{ direction: 'ltr' }}
        >
          <div className="min-w-[280px]">
            <div className="inline-flex items-center gap-2.5 bg-[#eef2f6] px-4 py-1.5 rounded-full text-sm font-medium text-[#1a2634] mb-3">
              <span>🔄</span>
              <span>Ciclo {activeCycle} · {CYCLE_LABELS[activeCycle]}</span>
              <span className="bg-[#1a2634] text-white rounded-full px-3 text-xs font-semibold leading-[22px]">
                {cyclePendientes} pendientes
              </span>
            </div>

            <div className="mb-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Progreso total</span>
                <span className="font-bold text-blue-600">{progressPercentage}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex justify-center mb-3">
              <div className={`${APRENDIDA_BG} ${APRENDIDA_BORDER} border rounded-full px-4 py-1 inline-flex items-center gap-1.5 font-medium ${APRENDIDA_TEXT} text-sm`}>
                <span>✅</span>
                <span>APRENDIDAS</span>
                <span className="font-bold text-base">{breakdown.aprendidas}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-[#f8faff] rounded-2xl p-4 border border-[#e9edf2]">
              {CYCLE_RULE_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="bg-white border border-[#e9edf2] px-2.5 py-1 rounded-full text-xs text-[#4a617a]"
                >
                  {chip}
                </span>
              ))}
            </div>

            <div className="mt-3 border-t border-[#edf2f7] pt-2.5 flex justify-between flex-wrap gap-1 text-xs text-[#4f6a84]">
              <span>
                📦 Total: {totalAssociations} · {CYCLE_LABELS[1]} {breakdown.nuevas} · {CYCLE_LABELS[2]} {breakdown.vistas} · {CYCLE_LABELS[3]} {breakdown.reconocidas} · {CYCLE_LABELS[4]} {breakdown.frecuentes}
              </span>
              <span className="bg-[#f0f4fc] px-3 rounded-full">🔄 ciclo {activeCycle} de 4</span>
            </div>
          </div>
        </div>

        <div
          className="bg-[#fafcff] p-5 flex flex-col items-center gap-3 min-w-[100px] border-l border-[#e9edf2] flex-shrink-0 transition-all duration-300"
          style={{ direction: 'ltr' }}
        >
          <span className="bg-[#1a2634] text-white rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap">
            📦 {totalAssociations}
          </span>

          <div className="flex flex-col gap-2 w-full">
            {stageBoxes.map((box) => {
              const colors = getStateColors(box.colorGroup);
              if (box.isActive && cycleMiniStats) {
                return (
                  <div key={box.key} className="w-full flex justify-center">
                    <CycleMiniBar
                      cycle={cycleMiniStats.cycle as 1 | 2 | 3 | 4}
                      pending={cycleMiniStats.pending}
                      correct={cycleMiniStats.correct}
                      total={cycleMiniStats.total}
                      isComplete={cycleMiniStats.isComplete}
                    />
                  </div>
                );
              }
              return (
                <div
                  key={box.key}
                  className={`w-full rounded-xl py-2 px-2.5 text-center border ${colors.bg} ${
                    box.isActive ? 'border-2 border-[#2563eb]' : colors.border
                  }`}
                >
                  <div className="text-2xl font-bold text-[#0b1a26] leading-tight">{box.count}</div>
                  <div className="text-xs font-medium text-[#64748b] uppercase tracking-wider">
                    {box.label}
                  </div>
                  <span className="block text-[0.65rem] text-[#94a3b8] mt-0.5">▼</span>
                </div>
              );
            })}
          </div>

          <div className={`mt-1 flex items-center gap-1.5 border rounded-full px-3.5 py-1 text-sm font-medium ${APRENDIDA_BG} ${APRENDIDA_BORDER} ${APRENDIDA_TEXT}`}>
            <span>✅</span>
            <span ref={learnedCountRef} className="font-bold text-base">{breakdown.aprendidas}</span>
            <span className="text-xs">aprendidas</span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="bg-none border-none cursor-pointer text-xl text-[#6b85a0] px-2 py-1 rounded-full hover:bg-[#eef2f6] transition-colors mt-1"
            aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
            aria-expanded={isExpanded}
            aria-controls="cycle-progress-details"
          >
            {isExpanded ? '▶' : '◀'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="w-full max-w-[560px] lg:w-auto lg:max-w-[520px] mx-auto shrink-0 bg-white rounded-2xl border border-[#e9edf2] shadow-sm overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[#eef2f6]">
        <h2 className="text-sm font-semibold text-[#4a617a]">Progreso por ciclo</h2>
        <span className="inline-flex flex-wrap items-center gap-2 bg-[#eef2f6] rounded-full px-3 py-1 text-xs font-medium text-[#1a2634]">
          <span>
            Ciclo {activeCycle} · {CYCLE_LABELS[activeCycle]}
          </span>
          <span className="bg-[#1a2634] text-white rounded-full px-2 py-0.5 text-xs font-semibold leading-4">
            {cyclePendientes} pendientes
          </span>
          <span className="font-normal text-[#94a3b8]">de 4</span>
        </span>
      </header>

      <div className="flex items-stretch gap-1.5 px-3 py-3 overflow-x-auto">
        {stageBoxes.map((box, index) => {
          const colors = getStateColors(box.colorGroup);
          return (
            <React.Fragment key={box.key}>
              {box.isActive && cycleMiniStats ? (
                <CycleMiniBar
                  cycle={cycleMiniStats.cycle as 1 | 2 | 3 | 4}
                  pending={cycleMiniStats.pending}
                  correct={cycleMiniStats.correct}
                  total={cycleMiniStats.total}
                  isComplete={cycleMiniStats.isComplete}
                />
              ) : (
                <div
                  className={`flex-1 min-w-[72px] rounded-xl px-2 py-2 text-center border ${colors.bg} ${
                    box.isActive ? 'border-2 border-[#2563eb]' : colors.border
                  }`}
                >
                  <div className="text-xs font-semibold uppercase text-[#64748b]">{box.label}</div>
                  <div className="text-2xl font-bold text-[#0b1a26] leading-tight">{box.count}</div>
                </div>
              )}
              {index < stageBoxes.length - 1 && (
                <span aria-hidden="true" className="self-center text-sm text-[#cbd5e1] select-none">
                  ➜
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-2">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${APRENDIDA_BG} ${APRENDIDA_BORDER} ${APRENDIDA_TEXT}`}
        >
          <span>APRENDIDAS</span>
          <span ref={learnedCountRef} className="font-bold text-sm">
            {breakdown.aprendidas}
          </span>
        </span>

        <span className="text-xs text-[#94a3b8]">Total: {totalAssociations}</span>

        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          aria-expanded={isExpanded}
          aria-controls="cycle-progress-details"
          className="bg-none border-none cursor-pointer text-xs font-medium text-[#94a3b8] px-2 py-1 rounded-full hover:bg-[#eef2f6] transition-colors"
        >
          {isExpanded ? 'Ocultar detalles ▲' : 'Toca para ver detalles ▼'}
        </button>
      </div>

      <div
        id="cycle-progress-details"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[240px] opacity-100 px-3 pb-3' : 'max-h-0 opacity-0 px-0 pb-0'
        }`}
      >
        <div className="flex flex-wrap gap-1.5 bg-[#f8faff] rounded-xl border border-[#e9edf2] px-3 py-2.5">
          {CYCLE_RULE_CHIPS.map((chip) => (
            <span
              key={chip}
              className="bg-white border border-[#e9edf2] px-2.5 py-1 rounded-full text-xs text-[#4a617a]"
            >
              {chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
