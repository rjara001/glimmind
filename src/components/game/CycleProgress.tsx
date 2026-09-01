import React, { useState, useMemo } from 'react';
import { GameState } from '../../types';
import { computeStateBreakdown } from '../../utils/progress';

interface CycleProgressProps {
  gameState: GameState;
  cycleColorName?: string;
}

interface LevelBox {
  key: string;
  label: string;
  level: string;
  count: number;  
  colorGroup: 'nueva' | 'vista' | 'reconocida' | 'frecuente' | 'aprendida';
  isActive: boolean;
}

// ===== PALETA DE COLORES SUAVES =====
const STATE_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  nueva: {
    bg: 'bg-[#f0f4fe]',
    border: 'border-[#c7d9f0]',
    text: 'text-[#1a2b3c]',
    badge: 'bg-[#eef2f6] text-[#1a2634]',
  },
  vista: {
    bg: 'bg-[#fef7e6]',
    border: 'border-[#f0e0b8]',
    text: 'text-[#1a2b3c]',
    badge: 'bg-[#eef2f6] text-[#1a2634]',
  },
  reconocida: {
    bg: 'bg-[#fce8e8]',
    border: 'border-[#f0c8c8]',
    text: 'text-[#1a2b3c]',
    badge: 'bg-[#eef2f6] text-[#1a2634]',
  },
  frecuente: {
    bg: 'bg-[#f0eaf8]',
    border: 'border-[#d8cce8]',
    text: 'text-[#1a2b3c]',
    badge: 'bg-[#eef2f6] text-[#1a2634]',
  },
  aprendida: {
    bg: 'bg-[#e3f3e3]',
    border: 'border-[#b8d9b8]',
    text: 'text-[#1a4a1a]',
    badge: 'bg-[#e3f3e3] text-[#1a4a1a]',
  },
};

// ===== ETIQUETAS DE CICLOS (renombradas visualmente) =====
const CYCLE_LABELS: Record<number, string> = {
  1: 'NUEVA',
  2: 'VISTA',
  3: 'RECONOCIDA',
  4: 'FRECUENTE', // ← antes "CONOCIDA"
};

export const CycleProgress: React.FC<CycleProgressProps> = ({ gameState }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

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

  // ===== CONFIGURACIÓN DE LAS 4 BOLSAS =====
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
      label: 'FRECUENTE', // ← antes "CONOCIDA"
      level: 'niv 3+',
      count: breakdown.conocidas,
      colorGroup: 'frecuente',
      isActive: activeCycle === 4,
    },
  ];

  const totalAssociationsCount = totalAssociations + breakdown.aprendidas;
  const learnedInFirstCycle = breakdown.aprendidas;

  // ===== BARRA DE PROGRESO =====
  const progressPercentage = totalAssociationsCount > 0
    ? Math.round((breakdown.aprendidas / totalAssociationsCount) * 100)
    : 0;

  return (
    <div
      className="flex items-stretch transition-all duration-300 rounded-[2rem] shadow-xl border border-black/[0.02] overflow-hidden min-h-[320px] max-w-[900px]"
      style={{ direction: 'rtl' }}
    >
      {/* ===== PANEL EXPANDIDO (se despliega desde la derecha) ===== */}
      <div
        className={`overflow-hidden transition-all duration-400 ease-in-out bg-white ${
          isExpanded ? 'max-w-[700px] opacity-100 p-5 pr-6' : 'max-w-0 opacity-0 p-0'
        }`}
        style={{ direction: 'ltr' }}
      >
        <div className="min-w-[280px]">
          {/* ===== CICLO BADGE ===== */}
          <div className="inline-flex items-center gap-2.5 bg-[#eef2f6] px-4 py-1.5 rounded-full text-sm font-medium text-[#1a2634] mb-3">
            <span>🔄</span>
            <span>Ciclo {activeCycle} · {CYCLE_LABELS[activeCycle]}</span>
            <span className="bg-[#1a2634] text-white rounded-full px-3 text-xs font-semibold leading-[22px]">
              {cyclePendientes} pendientes
            </span>
          </div>

          {/* ===== BARRA DE PROGRESO ===== */}
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

          {/* ===== DIAGRAMA DE FLUJO ===== */}
          <div className="bg-[#fafcff] rounded-2xl p-4 border border-[#e9edf2]">
            <div className="flex items-center justify-center flex-wrap gap-1">
              {levelBoxes.map((box, index) => {
                const colors = STATE_COLORS[box.colorGroup];
                return (
                  <React.Fragment key={box.key}>
                    <div
                      className={`rounded-2xl px-2.5 pt-2 pb-1.5 min-w-[70px] text-center border ${colors.bg} ${
                        box.isActive ? `border-2 border-[#2563eb] shadow-[0_4px_10px_-4px_rgba(37,99,235,0.15)]` : `border ${colors.border}`
                      }`}
                    >
                      <div className="font-semibold text-xs text-[#1a2b3c]">{box.label}</div>
                      <div className="text-[0.55rem] font-normal text-[#64748b] bg-white/50 inline-block px-2 rounded-full mt-0.5">
                        {box.level}
                      </div>
                      <div className="text-xl font-bold text-[#0b1a26] leading-tight mt-1">
                        {box.count}
                        {box.isActive && <span className="text-base ml-1 text-[#2563eb]">▲</span>}
                      </div>
                    </div>
                    {index < levelBoxes.length - 1 && (
                      <span className="text-base text-[#94a3b8] font-light px-0.5 select-none">➜</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* ===== APRENDIDAS ===== */}
            <div className="flex justify-center mt-2.5">
              <div className="bg-[#e3f3e3] border border-[#b8d9b8] rounded-full px-4 py-1 inline-flex items-center gap-1.5 font-medium text-[#1a4a1a] text-sm">
                <span>✅</span>
                <span>APRENDIDAS</span>
                <span className="font-bold text-base">{breakdown.aprendidas}</span>
              </div>
            </div>

            {/* ===== LEYENDA DE FLUJO ===== */}
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

          {/* ===== ACCIONES ===== */}
          <div className="flex flex-wrap justify-between items-center gap-2.5 bg-[#f8faff] rounded-2xl px-4 py-2.5 mt-3 border border-[#e9edf2]">
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#1e2f3f]">
              <span>📌</span>
              <span className="text-[#2c4d6b]">{learnedInFirstCycle} items aprendidos en 1er ciclo</span>
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

          {/* ===== FOOTER STATS ===== */}
          <div className="mt-2.5 border-t border-[#edf2f7] pt-2.5 flex justify-between flex-wrap gap-1 text-[0.7rem] text-[#4f6a84]">
            <span>
              📦 Total: {totalAssociationsCount} · NUEVA {breakdown.nuevas} · VISTA {breakdown.vistas} · RECONOCIDA {breakdown.reconocidas} · FRECUENTE {breakdown.conocidas}
            </span>
            <span className="bg-[#f0f4fc] px-3 rounded-full">🔄 ciclo {activeCycle} de 4</span>
          </div>

          {/* ===== ACORDEÓN "CÓMO FUNCIONA" ===== */}
          <div className="mt-3.5 border-t border-[#edf2f7] pt-3">
            <button
              onClick={() => setHowItWorksOpen(!howItWorksOpen)}
              className="flex justify-between items-center w-full cursor-pointer select-none py-1 hover:opacity-70 transition-opacity"
            >
              <span className="text-sm font-medium text-[#2c4a66] flex items-center gap-1.5">
                <span>🧠</span>
                ¿Cómo funciona?
              </span>
              <span
                className={`text-base text-[#6b85a0] transition-transform duration-200 ${
                  howItWorksOpen ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>
            </button>

            <div
              className={`overflow-hidden transition-all duration-350 ease-in-out ${
                howItWorksOpen ? 'max-h-[550px] opacity-100 mt-2.5' : 'max-h-0 opacity-0 mt-0'
              }`}
            >
              <div className="bg-[#f8faff] rounded-2xl p-3.5 border border-[#e9edf2] text-[0.82rem] leading-relaxed text-[#1f3347]">
                <p className="mb-2">
                  Este sistema te ayuda a memorizar mediante{' '}
                  <span className="font-semibold text-[#0b1a26]">ciclos de exposición progresiva</span>. Cada item pasa
                  por diferentes etapas según tu capacidad para recordarlo.
                </p>
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="bg-[#eef2f6] rounded-full px-2 text-[0.65rem] font-bold text-[#2c4a66] leading-5 whitespace-nowrap mt-0.5">
                    1
                  </span>
                  <span>
                    <span className="font-semibold text-[#0b1a26]">NUEVA</span> — Si aciertas →{' '}
                    <strong>APRENDIDAS</strong> ✅. Si fallas → <strong>VISTA</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="bg-[#eef2f6] rounded-full px-2 text-[0.65rem] font-bold text-[#2c4a66] leading-5 whitespace-nowrap mt-0.5">
                    2
                  </span>
                  <span>
                    <span className="font-semibold text-[#0b1a26]">VISTA</span> — Si aciertas → se queda. Si fallas →{' '}
                    <strong>RECONOCIDA</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="bg-[#eef2f6] rounded-full px-2 text-[0.65rem] font-bold text-[#2c4a66] leading-5 whitespace-nowrap mt-0.5">
                    3
                  </span>
                  <span>
                    <span className="font-semibold text-[#0b1a26]">RECONOCIDA</span> — Si aciertas → se queda. Si fallas
                    → <strong>FRECUENTE</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="bg-[#eef2f6] rounded-full px-2 text-[0.65rem] font-bold text-[#2c4a66] leading-5 whitespace-nowrap mt-0.5">
                    4
                  </span>
                  <span>
                    <span className="font-semibold text-[#0b1a26]">FRECUENTE</span> — No hay castigo: acierto o fallo, se
                    queda. Exposición repetida hasta retener.
                  </span>
                </div>
                <p className="mt-2 italic text-[#4f6a84]">
                  ⚡ <strong>APRENDIDAS</strong> = acierto en el <strong>primer ciclo</strong>. Ya no aparecen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== SIDEBAR (contraído, siempre visible) ===== */}
      <div
        className="bg-[#fafcff] p-5 flex flex-col items-center gap-3 min-w-[100px] border-l border-[#e9edf2] flex-shrink-0 transition-all duration-300"
        style={{ direction: 'ltr' }}
      >
        {/* ===== TOTAL ===== */}
        <span className="bg-[#1a2634] text-white rounded-full px-3.5 py-1 text-xs font-semibold tracking-wide whitespace-nowrap">
          📦 {totalAssociationsCount}
        </span>

        {/* ===== 4 CAJONCITOS ===== */}
        <div className="flex flex-col gap-2 w-full">
          {levelBoxes.map((box) => {
            const colors = STATE_COLORS[box.colorGroup];
            return (
              <div
                key={box.key}
                className={`rounded-xl py-2 px-2.5 text-center border ${colors.bg} ${
                  box.isActive ? 'border-2 border-[#2563eb]' : `border ${colors.border}`
                } transition-all duration-200 relative`}
              >
                <div className="text-2xl font-bold text-[#0b1a26] leading-tight">{box.count}</div>
                <div className="text-[0.55rem] font-medium text-[#64748b] uppercase tracking-wider">
                  {box.label}
                </div>
                {/* ===== FLECHA HACIA ABAJO ===== */}
                <span className="block text-[0.6rem] text-[#94a3b8] mt-0.5 animate-bounce">
                  ▼
                </span>
              </div>
            );
          })}
        </div>

        {/* ===== APRENDIDAS ===== */}
        <div className="mt-1 flex items-center gap-1.5 bg-[#e3f3e3] border border-[#b8d9b8] rounded-full px-3.5 py-1 text-sm font-medium text-[#1a4a1a]">
          <span>✅</span>
          <span className="font-bold text-base">{breakdown.aprendidas}</span>
          <span className="text-xs">aprendidas</span>
        </div>

        {/* ===== BOTÓN TOGGLE ===== */}
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