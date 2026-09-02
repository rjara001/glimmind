import React, { useState, useMemo } from 'react';
import { computeStateBreakdown } from '../../utils/progress';
import { CYCLE_LABELS, CYCLE_COLORS } from '../../utils/cycle-colors';
import { CycleMiniBar } from './CycleMiniBar';
import type { CycleProgressProps } from '../../types/cycle-progress-props';

interface LevelBox {
  key: string;
  label: string;
  level: string;
  count: number;
  colorGroup: 'nueva' | 'vista' | 'reconocida' | 'frecuente' | 'aprendida';
  isActive: boolean;
}

const BADGE_PALETTE: Record<string, string> = {
  nueva: 'bg-[#eef2f6] text-[#1a2634]',
  vista: 'bg-[#eef2f6] text-[#1a2634]',
  reconocida: 'bg-[#eef2f6] text-[#1a2634]',
  frecuente: 'bg-[#eef2f6] text-[#1a2634]',
  aprendida: 'bg-[#e3f3e3] text-[#1a4a1a]',
};

const APRENDIDA_OVERRIDES = {
  bg: 'bg-[#e3f3e3]',
  border: 'border-[#b8d9b8]',
  text: 'text-[#1a4a1a]',
};

function getStateColors(colorGroup: LevelBox['colorGroup']): {
  bg: string;
  border: string;
  text: string;
  badge: string;
} {
  if (colorGroup === 'aprendida') {
    return { ...APRENDIDA_OVERRIDES, badge: BADGE_PALETTE.aprendida };
  }
  const palette = CYCLE_COLORS[colorGroup];
  return {
    bg: `bg-[${palette.bg}]`,
    border: `border-[${palette.border}]`,
    text: `text-[${palette.text}]`,
    badge: BADGE_PALETTE[colorGroup],
  };
}

export const CycleProgress: React.FC<CycleProgressProps> = ({
  gameState,
  isMobile = false,
  learnedCountRef,
  cycleMiniStats,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const breakdown = useMemo(
    () => computeStateBreakdown(gameState.associations),
    [gameState.associations]
  );

  const totalAssociations = gameState.associations.filter(a => !a.isArchived).length;
  const activeCycle = gameState.globalCycle;
  const cyclePendientes = breakdown[
    activeCycle === 1 ? 'nuevas' :
    activeCycle === 2 ? 'vistas' :
    activeCycle === 3 ? 'reconocidas' : 'conocidas'
  ];

  const levelBoxes: LevelBox[] = [
    {
      key: 'nueva',
      label: 'NUEVA',
      level: 'niv 0',
      count: breakdown.nuevas,
      colorGroup: 'nueva',
      isActive: activeCycle === 1,
    },
    {
      key: 'vista',
      label: 'VISTA',
      level: 'niv 1',
      count: breakdown.vistas,
      colorGroup: 'vista',
      isActive: activeCycle === 2,
    },
    {
      key: 'reconocida',
      label: 'RECONOCIDA',
      level: 'niv 2',
      count: breakdown.reconocidas,
      colorGroup: 'reconocida',
      isActive: activeCycle === 3,
    },
    {
      key: 'frecuente',
      label: 'FRECUENTE',
      level: 'niv 3+',
      count: breakdown.conocidas,
      colorGroup: 'frecuente',
      isActive: activeCycle === 4,
    },
  ];

  const totalAssociationsCount = totalAssociations + breakdown.aprendidas;
  const progressPercentage = totalAssociationsCount > 0
    ? Math.round((breakdown.aprendidas / totalAssociationsCount) * 100)
    : 0;

  if (isMobile) {
    return (
      <div className="w-full max-w-[480px] mx-auto">
        <div className="flex items-center gap-1.5 px-2 mb-2 pt-2">
          <span className="text-[0.7rem] font-semibold text-[#4a617a]">
            📊 Tú progreso por ciclo
          </span>
        </div>
        <div className="bg-[#fafcff] rounded-[14px] border border-[#e9edf2] px-3 py-2.5 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-0.5 flex-1 overflow-x-auto py-0.5">
            {levelBoxes.map((box, index) => {
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
                      className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl min-w-[44px] border ${colors.bg} ${
                        `border ${colors.border}`
                      } flex-shrink-0`}
                    >
                      <span className="text-lg font-bold text-[#0b1a26] leading-tight">
                        {box.count}
                      </span>
                      <span className="text-[0.45rem] mt-0.5 block text-[#94a3b8]">▼</span>
                    </div>
                  )}
                  {index < levelBoxes.length - 1 && (
                    <span className="text-[0.7rem] text-[#cbd5e1] flex-shrink-0 px-px">➜</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
          <div className="flex items-center gap-0.5 bg-[#e3f3e3] border border-[#b8d9b8] rounded-full px-2.5 py-0.5 text-[0.6rem] font-medium text-[#1a4a1a] whitespace-nowrap flex-shrink-0">
            <span>✅</span>
            <span ref={learnedCountRef as any} className="font-bold text-[0.8rem]">{breakdown.aprendidas}</span>
          </div>
        </div>

        <div
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-center gap-1.5 py-1.5 cursor-pointer select-none hover:opacity-70"
        >
          <span className="text-[0.6rem] font-medium text-[#94a3b8] tracking-wider">
            {isExpanded ? 'Ocultar detalles' : 'Toca para ver detalles'}
          </span>
          <span
            className={`text-[0.6rem] text-[#94a3b8] transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          >
            ▼
          </span>
        </div>

        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out ${
            isExpanded ? 'max-h-[600px] opacity-100 mt-2.5' : 'max-h-0 opacity-0 mt-0'
          }`}
        >
          <div className="bg-[#f8faff] rounded-2xl p-4 border border-[#e9edf2]">
            <div className="inline-flex items-center gap-2 bg-[#eef2f6] pl-3 pr-3.5 py-1 rounded-full text-[0.7rem] font-medium text-[#1a2634] mb-2.5">
              <span>🔄</span>
              <span>Ciclo {activeCycle} · {CYCLE_LABELS[activeCycle]}</span>
              <span className="bg-[#1a2634] text-white rounded-full px-2.5 text-[0.6rem] font-semibold leading-5">
                {cyclePendientes} pendientes
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1 mb-2.5">
              {levelBoxes.map((box) => {
                const colors = getStateColors(box.colorGroup);
                return (
                  <div
                    key={box.key}
                    className={`text-center py-2 px-1 rounded-[10px] border ${colors.bg} ${
                      box.isActive
                        ? 'border-2 border-[#2563eb]'
                        : `border ${colors.border}`
                    }`}
                  >
                    <div className="text-[0.5rem] font-semibold text-[#64748b] uppercase tracking-wider">
                      {box.label}
                    </div>
                    <div className="text-[0.4rem] text-[#94a3b8]">{box.level}</div>
                    <div className="text-[1.1rem] font-bold text-[#0b1a26] leading-tight">
                      {box.count}
                      {box.isActive && <span className="text-[0.6rem] ml-0.5 text-[#2563eb]">▲</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-1.5 bg-[#e3f3e3] border border-[#b8d9b8] rounded-full px-3.5 py-1 text-[0.7rem] font-medium text-[#1a4a1a] mb-2.5">
              <span>✅</span>
              <span>APRENDIDAS</span>
              <span className="font-bold text-[0.9rem]">{breakdown.aprendidas}</span>
            </div>

            <div className="mb-2.5">
              <div className="flex justify-between text-[0.65rem] text-[#4a617a]">
                <span>📊 Progreso real</span>
                <span className="font-bold text-[#2563eb]">{progressPercentage}%</span>
              </div>
              <div className="w-full h-1 bg-[#e2e8f0] rounded-full overflow-hidden mt-0.5">
                <div
                  className="h-full bg-[#2563eb] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-1 text-[0.6rem] text-[#4a617a]">
              <span className="bg-[#f1f5f9] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                ⬇ Acierto 1er ciclo → APRENDIDAS
              </span>
              <span className="bg-[#f1f5f9] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                ❌ Falla → siguiente nivel
              </span>
              <span className="bg-[#f1f5f9] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                ✅ Acierto → permanece
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-stretch transition-all duration-300 rounded-[2rem] shadow-xl border border-black/[0.02] overflow-hidden min-h-[320px] max-w-[900px]"
      style={{ direction: 'rtl' }}
    >
      <div
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

          <div className="bg-[#fafcff] rounded-2xl p-4 border border-[#e9edf2]">
            <div className="flex items-center justify-center flex-wrap gap-1">
              {levelBoxes.map((box, index) => {
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
                        className={`rounded-2xl px-2.5 pt-2 pb-1.5 min-w-[70px] text-center border ${colors.bg} ${`border ${colors.border}`}`}
                      >
                        <div className="font-semibold text-xs text-[#1a2b3c]">{box.label}</div>
                        <div className="text-[0.55rem] font-normal text-[#64748b] bg-white/50 inline-block px-2 rounded-full mt-0.5">
                          {box.level}
                        </div>
                        <div className="text-xl font-bold text-[#0b1a26] leading-tight mt-1">
                          {box.count}
                        </div>
                      </div>
                    )}
                    {index < levelBoxes.length - 1 && (
                      <span className="text-base text-[#94a3b8] font-light px-0.5 select-none">➜</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="flex justify-center mt-2.5">
              <div className="bg-[#e3f3e3] border border-[#b8d9b8] rounded-full px-4 py-1 inline-flex items-center gap-1.5 font-medium text-[#1a4a1a] text-sm">
                <span>✅</span>
                <span>APRENDIDAS</span>
                <span className="font-bold text-base">{breakdown.aprendidas}</span>
              </div>
            </div>

            <div className="flex justify-center gap-6 flex-wrap mt-2.5 text-[0.7rem] text-[#4a617a]">
              <span className="bg-[#f1f5f9] px-3 py-0.5 rounded-full inline-flex items-center gap-1">
                ⬇ Acierto 1er ciclo → APRENDIDAS
              </span>
              <span className="bg-[#f1f5f9] px-3 py-0.5 rounded-full inline-flex items-center gap-1">
                ❌ Falla → siguiente nivel
              </span>
              <span className="bg-[#f1f5f9] px-3 py-0.5 rounded-full inline-flex items-center gap-1">
                ✅ Acierto → permanece
              </span>
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2.5 bg-[#f8faff] rounded-2xl px-4 py-2.5 mt-3 border border-[#e9edf2]">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#1e2f3f]">
              <span>📌</span>
              <span className="text-[#2c4d6b]">{breakdown.aprendidas} items aprendidos en 1er ciclo</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-[#1e2f3f]">
              <span>🔁</span>
              <span className="bg-[#eef2f6] rounded-full px-2.5 text-[0.65rem] font-semibold text-[#1f3a4b] leading-5">
                {CYCLE_LABELS[activeCycle]}: acierto → se queda
              </span>
              <span className="bg-[#fce8e8] rounded-full px-2.5 text-[0.65rem] font-semibold text-[#8b3a3a] leading-5">
                falla → {activeCycle < 4 ? CYCLE_LABELS[activeCycle + 1] : 'permanece'}
              </span>
            </div>
          </div>

          <div className="mt-2.5 border-t border-[#edf2f7] pt-2.5 flex justify-between flex-wrap gap-1 text-[0.7rem] text-[#4f6a84]">
            <span>
              📦 Total: {totalAssociationsCount} · NUEVA {breakdown.nuevas} · VISTA {breakdown.vistas} · RECONOCIDA {breakdown.reconocidas} · FRECUENTE {breakdown.conocidas}
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
          📦 {totalAssociationsCount}
        </span>

        <div className="flex flex-col gap-2 w-full">
          {levelBoxes.map((box) => {
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
                className={`rounded-xl py-2 px-2.5 text-center border ${colors.bg} ${`border ${colors.border}`} transition-all duration-200 relative`}
              >
                <div className="text-2xl font-bold text-[#0b1a26] leading-tight">{box.count}</div>
                <div className="text-[0.55rem] font-medium text-[#64748b] uppercase tracking-wider">
                  {box.label}
                </div>
                <span className="block text-[0.6rem] text-[#94a3b8] mt-0.5 animate-bounce">
                  ▼
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-1 flex items-center gap-1.5 bg-[#e3f3e3] border border-[#b8d9b8] rounded-full px-3.5 py-1 text-sm font-medium text-[#1a4a1a]">
          <span>✅</span>
          <span ref={learnedCountRef as any} className="font-bold text-base">{breakdown.aprendidas}</span>
          <span className="text-xs">aprendidas</span>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="bg-none border-none cursor-pointer text-xl text-[#6b85a0] px-2 py-1 rounded-full hover:bg-[#eef2f6] transition-colors mt-1"
          aria-label={isExpanded ? 'Colapsar' : 'Expandir'}
        >
          {isExpanded ? '▶' : '◀'}
        </button>
      </div>
    </div>
  );
};
