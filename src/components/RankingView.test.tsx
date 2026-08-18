import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RankingView } from './views/RankingView';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_SETTINGS } from '../types/settings';
import { Association, AssociationList } from '../types';

const makeList = (overrides: Partial<AssociationList> = {}): AssociationList => ({
  id: 'l1',
  userId: 'u1',
  name: 'Verbos',
  concept: 'Phrasal verbs',
  associations: [],
  isArchived: false,
  settings: { mode: 'training', flipOrder: 'normal', threshold: 0.8 },
  ...overrides,
});

const makeAssociation = (overrides: Partial<Association> = {}): Association => ({
  id: 'a1',
  term: 'Give up',
  definition: 'Rendirse',
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  hits: 3,
  misses: 1,
  timesPlayed: 4,
  ...overrides,
});

describe('RankingView', () => {
  const onGoToSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      lists: [],
    });
  });

  it('shows the empty state with a settings link when history is disabled', () => {
    render(<RankingView onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Ranking desactivado')).toBeInTheDocument();
  });

  it('renders the plays ranking when enabled', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      lists: [
        makeList({
          associations: [
            makeAssociation(),
            makeAssociation({ id: 'a2', term: 'Take off', hits: 1, misses: 0, timesPlayed: 1 }),
          ],
        }),
      ],
    });
    render(<RankingView onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Give up')).toBeInTheDocument();
    expect(screen.getByText('Take off')).toBeInTheDocument();
    expect(screen.getAllByText('Verbos').length).toBeGreaterThan(0);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('switches to the weakness ranking when the tab is clicked', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      lists: [
        makeList({
          associations: [
            makeAssociation({ id: 'a1', term: 'Give up', hits: 3, misses: 1, timesPlayed: 4 }),
            makeAssociation({ id: 'a2', term: 'Take off', hits: 1, misses: 0, timesPlayed: 1 }),
          ],
        }),
      ],
    });
    render(<RankingView onGoToSettings={onGoToSettings} />);
    fireEvent.click(screen.getByText('Menos correctas'));
    const rows = screen.getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Take off');
    expect(rows[2]).toHaveTextContent('Give up');
  });

  it('shows the empty data message when no cards have been played', () => {
    useGameStore.setState({
      settings: { activityHistoryEnabled: true, audioRecordingEnabled: false },
      lists: [
        makeList({
          associations: [makeAssociation({ hits: 0, misses: 0, timesPlayed: 0 })],
        }),
      ],
    });
    render(<RankingView onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
  });
});
