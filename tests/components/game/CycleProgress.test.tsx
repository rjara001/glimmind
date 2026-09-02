import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CycleProgress } from '@/components/game/CycleProgress';
import type { GameState } from '@/types';

const mockGameState: GameState = {
  listId: 'list-1',
  globalCycle: 1,
  associations: [
    {
      id: 'a1',
      term: 'hello',
      definition: ['hola'],
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    },
    {
      id: 'a2',
      term: 'world',
      definition: ['mundo'],
      currentCycle: 2,
      status: 'correct',
      isLearned: false,
      isArchived: false,
    },
  ],
  activeQueue: ['a1', 'a2'],
  currentIndex: 0,
  isFinished: false,
  summary: null,
  revealed: false,
  userInput: '',
  feedback: 'none',
  similarity: null,
  lastAttempt: '',
  attempts: [],
  revealedAssociations: [],
};

describe('CycleProgress component', () => {
  test('renders mobile horizontal train layout when isMobile is true', () => {
    const { container } = render(
      <CycleProgress gameState={mockGameState} isMobile={true} />
    );

     const train = container.querySelector('.overflow-x-auto');
    expect(train).not.toBeNull();

    const arrows = container.querySelectorAll('span');
    const hasArrow = Array.from(arrows).some(el => el.textContent === '➜');
    expect(hasArrow).toBe(true);

    expect(screen.getByText('Toca para ver detalles')).toBeInTheDocument();

    expect(screen.getByText('📊 Progreso por ciclo')).toBeInTheDocument();
  });

  test('does not render the mobile title when isMobile is false', () => {
    render(<CycleProgress gameState={mockGameState} isMobile={false} />);

    expect(screen.queryByText('📊 Progreso por ciclo')).not.toBeInTheDocument();
  });

  test('renders desktop vertical sidebar layout when isMobile is false', () => {
    const { container } = render(
      <CycleProgress gameState={mockGameState} isMobile={false} />
    );

    const mainWrapper = container.querySelector('div[style*="rtl"]');
    expect(mainWrapper).not.toBeNull();
    expect(mainWrapper?.className).toContain('min-h-[320px]');

    const toggle = screen.getByLabelText(/Expandir|Colapsar/);
    expect(toggle).toBeInTheDocument();
  });

  test('renders desktop layout by default when isMobile is undefined', () => {
    const { container } = render(
      <CycleProgress gameState={mockGameState} />
    );

    const mainWrapper = container.querySelector('div[style*="rtl"]');
    expect(mainWrapper).not.toBeNull();
    expect(mainWrapper?.className).toContain('min-h-[320px]');
  });
});
