import { describe, expect, test } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CycleProgress } from '@/components/game/CycleProgress';
import { CYCLE_RULE_CHIPS } from '@/utils/cycle-rules';
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

describe('CycleProgress structure', () => {
  test('renders one adaptive layout showing the four stages', () => {
    const { container } = render(<CycleProgress gameState={mockGameState} />);

    expect(container.querySelector('.overflow-x-auto')).not.toBeNull();
    expect(screen.getByText('Progreso por ciclo')).toBeInTheDocument();

    ['NUEVA', 'VISTA', 'RECONOCIDA', 'FRECUENTE'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    expect(screen.getAllByText('➜')).toHaveLength(3);
  });

  test('never renders the retired level jargon or the competing percentages', () => {
    const { container } = render(<CycleProgress gameState={mockGameState} />);

    expect(container.textContent).not.toMatch(/niv \d/);
    expect(screen.queryByText('Progreso real')).not.toBeInTheDocument();
    expect(screen.queryByText('Progreso total')).not.toBeInTheDocument();
    expect(screen.queryByText(/items aprendidos en 1er ciclo/)).not.toBeInTheDocument();
  });

  test('renders one toggle that expands the rule panel', () => {
    render(<CycleProgress gameState={mockGameState} />);

    const toggle = screen.getByRole('button', { name: /Toca para ver detalles/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('button', { name: /Ocultar detalles/ })).toBeInTheDocument();
  });

  test('shows the deck total exactly once', () => {
    render(<CycleProgress gameState={mockGameState} />);

    expect(screen.getAllByText('Total: 2')).toHaveLength(1);
  });

  test('attaches the learned-count ref to the APRENDIDAS counter', () => {
    const ref = { current: null } as React.RefObject<HTMLSpanElement | null>;
    const gameState: GameState = {
      ...mockGameState,
      associations: mockGameState.associations.map((a) =>
        a.id === 'a2' ? { ...a, isLearned: true } : a,
      ),
    };

    render(<CycleProgress gameState={gameState} learnedCountRef={ref} />);

    expect(ref.current?.textContent).toBe('1');
  });
});

describe('CycleProgress cycle rules', () => {
  test('states each engine rule exactly once and none of the retired ones', () => {
    const { container } = render(<CycleProgress gameState={mockGameState} />);

    CYCLE_RULE_CHIPS.forEach((chip) => {
      expect(screen.getAllByText(chip)).toHaveLength(1);
    });

    expect(container.textContent).not.toMatch(/Falla → siguiente nivel/);
    expect(container.textContent).not.toMatch(/Acierto → permanece/);
    expect(container.textContent).not.toMatch(/falla →/i);
  });

  test('does not double-count learned cards in the displayed total', () => {
    const gameState: GameState = {
      ...mockGameState,
      associations: mockGameState.associations.map((a) =>
        a.id === 'a2' ? { ...a, isLearned: true } : a,
      ),
    };

    render(<CycleProgress gameState={gameState} />);

    expect(screen.getAllByText('Total: 2')).toHaveLength(1);

    const aprendidasPill = screen.getByText('APRENDIDAS').parentElement;
    expect(aprendidasPill).toHaveTextContent('1');
  });
});
