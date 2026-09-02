import React from 'react';
import type { CycleMiniBarProps } from '../../types/cycle-mini-bar-props';
import { CYCLE_LABELS, CYCLE_COLORS, cycleToColorKey } from '../../utils/cycle-colors';

const ACTIVE_BORDER = '#2563eb';
const COMPLETE_BORDER = '#059669';
const TRACK_COLOR = '#e2e8f0';
const FILL_COLOR = '#059669';
const PENDING_COLOR = '#64748b';
const PENDING_LABEL_COLOR = '#94a3b8';
const CORRECT_COLOR = '#059669';
const CORRECT_LABEL_COLOR = '#6ee7b7';
const NAME_COLOR = '#64748b';
const NAME_BORDER = 'rgba(0, 0, 0, 0.05)';

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
  const borderColor = isComplete ? COMPLETE_BORDER : ACTIVE_BORDER;

  return (
    <div
      className="flex flex-col items-center px-4 py-3 rounded-xl max-w-[180px] mx-auto border-2 shadow-[0_2px_8px_rgba(37,99,235,0.15)] transition-all duration-300"
      style={{ background: colors.bg, borderColor }}
    >
      <div className="flex justify-between w-full text-[0.7rem] font-medium">
        <span style={{ color: PENDING_COLOR }}>
          <span aria-hidden="true">⏳</span> {pending}{' '}
          <span className="text-[0.5rem] font-normal" style={{ color: PENDING_LABEL_COLOR }}>
            pend.
          </span>
        </span>
        <span style={{ color: CORRECT_COLOR }}>
          <span aria-hidden="true">✅</span> {correct}{' '}
          <span className="text-[0.5rem] font-normal" style={{ color: CORRECT_LABEL_COLOR }}>
            corr.
          </span>
        </span>
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

      <span
        className="text-[0.65rem] font-bold uppercase tracking-wider mt-1 pt-1 w-full text-center"
        style={{ color: NAME_COLOR, borderTop: `1px solid ${NAME_BORDER}` }}
      >
        {isComplete ? `✅ ${label}` : label}
      </span>
    </div>
  );
};
