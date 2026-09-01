import React from 'react';
import { GameSummary } from '../../types';

interface FinishedScreenProps {
  summary: GameSummary | null;
  onRestart: () => void;
  onBack: () => void;
  onArchive: () => void;
}

interface SummaryCardConfig {
  key: string;
  label: string;
  level: string;
  value: number;
  className: string;
  numberClassName: string;
  labelClassName: string;
  levelClassName: string;
}

const getSummaryCards = (summary: GameSummary | null): SummaryCardConfig[] => {
  if (!summary) return [];
  
  return [
    {
      key: 'nueva',
      label: 'NUEVA',
      level: '(nivel 0)',
      value: summary.seen,
      className: 'bg-[#f0f4fe] border-[#c7d9f0]',
      numberClassName: 'text-[#1a2b3c]',
      labelClassName: 'text-[#64748b]',
      levelClassName: 'text-[#94a3b8]',
    },
    {
      key: 'vista',
      label: 'VISTA',
      level: '(nivel 1)',
      value: summary.recognized,
      className: 'bg-[#fef7e6] border-[#f0e0b8]',
      numberClassName: 'text-[#1a2b3c]',
      labelClassName: 'text-[#64748b]',
      levelClassName: 'text-[#94a3b8]',
    },
    {
      key: 'frecuente',
      label: 'FRECUENTE',
      level: '(nivel 3+)',
      value: summary.known,
      className: 'bg-[#f0eaf8] border-[#d8cce8]',
      numberClassName: 'text-[#1a2b3c]',
      labelClassName: 'text-[#64748b]',
      levelClassName: 'text-[#94a3b8]',
    },
    {
      key: 'aprendidas',
      label: '✅ APRENDIDAS',
      level: '(1er ciclo)',
      value: summary.learned,
      className: 'bg-[#e3f3e3] border-[#b8d9b8] ring-2 ring-[#34d399] ring-offset-2',
      numberClassName: 'text-[#1a4a1a] font-extrabold',
      labelClassName: 'text-[#1a6a1a]',
      levelClassName: 'text-[#4a8a4a]',
    },
  ];
};

export const FinishedScreen: React.FC<FinishedScreenProps> = ({ summary, onRestart, onBack, onArchive }) => {
  const summaryCards = getSummaryCards(summary);
  const hasLearnedCards = summary && summary.learned > 0;
  const learnedCount = summary?.learned ?? 0;

  return (
    <div className="max-w-[520px] w-full mx-auto mt-20 bg-white rounded-[28px] shadow-[0_20px_48px_-12px_rgba(0,20,30,0.20)] p-8 pb-7 transition-all duration-300 ease-in-out animate-in zoom-in-95">
      {/* Título */}
      <div className="text-center mb-6">
        <span className="text-[2.4rem] block mb-1.5">🎯</span>
        <h1 className="text-2xl font-bold text-[#0b1a26]">¡Sesión Completada!</h1>
        <p className="text-sm text-slate-500 mt-0.5">Este es tu progreso en esta sesión</p>
      </div>

      {/* Tabla de bolsas */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {summaryCards.map((card) => (
          <div
            key={card.key}
            className={`text-center py-3.5 px-2 rounded-[14px] border transition-all duration-150 ${card.className}`}
          >
            <div className={`text-[1.8rem] font-bold leading-tight ${card.numberClassName}`}>
              {card.value}
            </div>
            <div className={`text-[0.55rem] font-semibold uppercase tracking-wider ${card.labelClassName}`}>
              {card.label}
            </div>
            <div className={`text-[0.45rem] mt-0.5 ${card.levelClassName}`}>
              {card.level}
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje de logro */}
      {hasLearnedCards && (
        <div className="bg-[#ecfdf5] border border-[#a7f3d0] rounded-xl py-2.5 px-4 text-center mb-5">
          <span className="text-sm font-medium text-[#065f46]">
            🏆 ¡Has aprendido <strong className="font-bold text-[#047857]">{learnedCount}</strong> items en esta sesión!
          </span>
        </div>
      )}

      {/* Mensaje cuando no hay items aprendidos */}
      {!hasLearnedCards && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center text-slate-400 text-sm mb-5">
          No se marcaron items como aprendidos en esta sesión.
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col gap-2.5">
        {/* Acción principal: Archivar */}
        {hasLearnedCards && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="flex items-start gap-2.5 mb-3">
              <span className="text-xl leading-normal">🧹</span>
              <div>
                <div className="text-sm font-semibold text-slate-900">¿Qué quieres hacer con los items aprendidos?</div>
                <div className="text-[0.75rem] text-slate-500 mt-px">
                  Los <strong className="text-slate-900">{learnedCount}</strong> items en "Aprendidas" ya no necesitan aparecer.
                  Puedes archivarlos para mantener tu lista limpia.
                </div>
              </div>
            </div>
            <button
              onClick={onArchive}
              className="w-full py-3 px-4 bg-[#059669] text-white rounded-xl text-sm font-semibold cursor-pointer transition-colors duration-150 flex items-center justify-center gap-2 shadow-[0_2px_8px_rgba(5,150,105,0.25)] hover:bg-[#047857] active:scale-95"
            >
              <span>📦</span>
              Archivar items aprendidos y reiniciar
            </button>
            <div className="text-[0.6rem] text-slate-400 text-center mt-2">
              ⚠️ Los items archivados se guardarán y <strong className="text-slate-500">no volverán a aparecer</strong> en futuras sesiones.
            </div>
          </div>
        )}

        {/* Acción secundaria: Reiniciar sin archivar */}
        <button
          onClick={onRestart}
          className="w-full py-3 px-4 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-medium cursor-pointer transition-all duration-150 flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-300 active:scale-95"
        >
          <span>🔄</span>
          Reiniciar sin archivar
        </button>

        {/* Acción terciaria: Regresar */}
        <button
          onClick={onBack}
          className="w-full py-2.5 px-4 bg-transparent text-slate-400 rounded-xl text-[0.8rem] font-medium cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5 hover:bg-slate-100 hover:text-slate-500 active:scale-95"
        >
          <span>←</span>
          Regresar al panel
        </button>
      </div>
    </div>
  );
};
