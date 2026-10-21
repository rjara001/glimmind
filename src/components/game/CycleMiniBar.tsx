import React from 'react';
import type { CycleMiniBarProps } from '../../types/cycle-mini-bar-props';
import { CYCLE_LABELS, CYCLE_COLORS, cycleToColorKey } from '../../utils/cycle-colors';

const ACTIVE_BORDER = '#2563eb';
const COMPLETE_BORDER = '#059669';
const TRACK_COLOR = '#e2e8f0';
const FILL_COLOR = '#059669';

export const CycleMiniBar: React.FC<CycleMiniBarProps> = ({
  cycle,
  pending,
  correct,
  total,
  isComplete = false,
}) => {
  const label = CYCLE_LABELS[cycle] ?? '';
  const colors = CYCLE_COLORS[cycleToColorKey(cycle)];
  const pct = total > 0 ? (correct / total) * 100 : 0;

  return (
    <div
      className="flex-1 min-w-[72px] rounded-xl px-2 py-2 text-center border-2"
      style={{ background: colors.bg, borderColor: isComplete ? COMPLETE_BORDER : ACTIVE_BORDER }}
    >
      <div className="text-xs font-semibold uppercase text-[#64748b]">{label}</div>
      <div className="flex items-center justify-center gap-2 mt-0.5 text-xs font-medium text-[#4a617a]">
        <span>
          {pending} <span className="font-normal text-[#94a3b8]">pend.</span>
        </span>
        <span className="font-bold text-[#059669]">{correct}</span>
      </div>
      <div
        className="w-full h-1 rounded-full overflow-hidden mt-1"
        style={{ background: TRACK_COLOR }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: FILL_COLOR }}
        />
      </div>
    </div>
  );
};
