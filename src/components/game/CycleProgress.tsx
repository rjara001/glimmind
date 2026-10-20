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
    activeCycle === 3 ? 'reconocidas' : 'conocidas'
  ];

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
      count: breakdown.conocidas,
      colorGroup: 'frecuente',
      isActive: activeCycle === 4,
    },
  ];
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
