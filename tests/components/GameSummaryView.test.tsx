import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameSummaryView } from '@/components/GameSummaryView';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { GameSessionSummary } from '@/types/activity';

const makeSession = (overrides: Partial<GameSessionSummary> = {}): GameSessionSummary => ({
  id: 's1',
  listId: 'l1',
  listName: 'Verbos',
  startedAt: new Date(2026, 7, 7, 10, 0).getTime(),
  endedAt: new Date(2026, 7, 7, 10, 30).getTime(),
  cardsPlayed: 3,
  correct: 2,
  incorrect: 1,
  byLevel: { nuevas: 0, vistas: 1, reconocidas: 0, conocidas: 0, aprendidas: 2 },
  ...overrides,
});

describe('GameSummaryView', () => {
  const onGoToSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      sessions: [],
      sessionsLoading: false,
      loadSessions: vi.fn(),
    });
  });

  it('shows the empty state with a settings link when history is disabled', () => {
    render(<GameSummaryView onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Resumen de juegos desactivado')).toBeInTheDocument();
  });

  it('shows a loading message while sessions are loading', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      sessions: [],
      sessionsLoading: true,
    });
    render(<GameSummaryView onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Cargando...')).toBeInTheDocument();
  });

  it('shows the empty sessions message when enabled and no sessions exist', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      sessions: [],
      sessionsLoading: false,
    });
    render(<GameSummaryView onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Sin sesiones')).toBeInTheDocument();
  });

  it('renders session summaries when enabled', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      sessions: [makeSession()],
      sessionsLoading: false,
    });
    render(<GameSummaryView onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Verbos')).toBeInTheDocument();
    expect(screen.getByText('3 tarjetas')).toBeInTheDocument();
    expect(screen.getByText(/Correctas: 2/)).toBeInTheDocument();
    expect(screen.getByText(/Incorrectas: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Vista: 1/)).toBeInTheDocument();
    expect(screen.getByText(/Aprendida: 2/)).toBeInTheDocument();
  });
});
