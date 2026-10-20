import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FinishedScreen } from '@/components/game/FinishedScreen';
import { CYCLE_LABELS } from '@/utils/cycle-colors';
import type { GameSummary } from '@/types';

const noop = vi.fn();

const summary: GameSummary = {
  unseen: 1,
  seen: 2,
  recognized: 3,
  known: 4,
  learned: 5,
};

const renderSummary = (value: GameSummary | null = summary) =>
  render(<FinishedScreen summary={value} onRestart={noop} onBack={noop} onArchive={noop} />);

const tileValue = (label: string): string => {
  const labelElement = screen.getByText(label);
  const tile = labelElement.parentElement;
  if (!tile || !tile.firstElementChild) {
    throw new Error(`No tile found for label: ${label}`);
  }
  return tile.firstElementChild.textContent ?? '';
};

describe('FinishedScreen summary tiles', () => {
  test('renders one tile per state, including RECONOCIDA', () => {
    renderSummary();

    expect(screen.getByText(CYCLE_LABELS[1])).toBeInTheDocument();
    expect(screen.getByText(CYCLE_LABELS[2])).toBeInTheDocument();
    expect(screen.getByText(CYCLE_LABELS[3])).toBeInTheDocument();
    expect(screen.getByText(CYCLE_LABELS[4])).toBeInTheDocument();
    expect(screen.getByText('✅ APRENDIDAS')).toBeInTheDocument();
  });

  test('maps every bucket to its own label without shifting a cycle', () => {
    renderSummary();

    expect(tileValue(CYCLE_LABELS[1])).toBe('1');
    expect(tileValue(CYCLE_LABELS[2])).toBe('2');
    expect(tileValue(CYCLE_LABELS[3])).toBe('3');
    expect(tileValue(CYCLE_LABELS[4])).toBe('4');
    expect(tileValue('✅ APRENDIDAS')).toBe('5');
  });

  test('tile values reconcile to the deck size', () => {
    renderSummary();

    const total = [
      CYCLE_LABELS[1],
      CYCLE_LABELS[2],
      CYCLE_LABELS[3],
      CYCLE_LABELS[4],
      '✅ APRENDIDAS',
    ].reduce((acc, label) => acc + Number(tileValue(label)), 0);

    const deckSize = summary.unseen + summary.seen + summary.recognized + summary.known + summary.learned;
    expect(total).toBe(deckSize);
  });

  test('renders no tiles when there is no summary', () => {
    renderSummary(null);

    expect(screen.queryByText(CYCLE_LABELS[1])).not.toBeInTheDocument();
    expect(screen.queryByText('✅ APRENDIDAS')).not.toBeInTheDocument();
  });
});
