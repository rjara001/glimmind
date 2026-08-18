import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryView } from '@/components/views/HistoryView';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { CardActivityEvent } from '@/types/activity';

const makeEvent = (overrides: Partial<CardActivityEvent> = {}): CardActivityEvent => ({
  id: 'e1',
  userId: 'u1',
  listId: 'l1',
  cardId: 'c1',
  cardTerm: 'Hola',
  type: 'card_answered',
  at: new Date(2026, 7, 7, 10, 30).getTime(),
  correct: true,
  ...overrides,
});

describe('HistoryView', () => {
  const onGoToSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      activity: [],
      activityNextCursor: undefined,
      activityLoading: false,
    });
  });

  it('shows the empty state with a settings link when history is disabled', () => {
    render(<HistoryView onBack={vi.fn()} onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Historial desactivado')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Ir a Configuración'));
    expect(onGoToSettings).toHaveBeenCalled();
  });

  it('renders activity events grouped when enabled', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      activity: [
        makeEvent(),
        makeEvent({
          id: 'e2',
          cardTerm: 'Mundo',
          type: 'card_level_up',
          toLevel: 'vistas',
          at: new Date(2026, 7, 7, 11, 0).getTime(),
        }),
      ],
      loadActivity: vi.fn(),
    });
    render(<HistoryView onBack={vi.fn()} onGoToSettings={onGoToSettings} />);
    expect(screen.getByText(/Correcta: Hola/)).toBeInTheDocument();
    expect(screen.getByText(/Mundo → Vista/)).toBeInTheDocument();
  });

  it('shows the load more button when a next cursor exists', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      activity: [makeEvent()],
      activityNextCursor: 'cursor-1',
      loadActivity: vi.fn(),
    });
    render(<HistoryView onBack={vi.fn()} onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Cargar más')).toBeInTheDocument();
  });

  it('filters activity by list', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      lists: [
        {
          id: 'l1',
          userId: 'u1',
          name: 'Verbos',
          concept: 'x/y',
          associations: [],
          isArchived: false,
          settings: { mode: 'training', flipOrder: 'normal', threshold: 0.8 },
        },
        {
          id: 'l2',
          userId: 'u1',
          name: 'Colores',
          concept: 'x/y',
          associations: [],
          isArchived: false,
          settings: { mode: 'training', flipOrder: 'normal', threshold: 0.8 },
        },
      ],
      activity: [
        makeEvent(),
        makeEvent({ id: 'e2', listId: 'l2', cardTerm: 'Rojo', at: new Date(2026, 7, 7, 11, 0).getTime() }),
      ],
      loadActivity: vi.fn(),
    });
    render(<HistoryView onBack={vi.fn()} onGoToSettings={onGoToSettings} />);
    fireEvent.change(screen.getByLabelText('Filtrar por lista'), { target: { value: 'l2' } });
    expect(screen.getByText(/Correcta: Rojo/)).toBeInTheDocument();
    expect(screen.queryByText(/Correcta: Hola/)).not.toBeInTheDocument();
  });
});
