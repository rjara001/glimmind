import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { CardActivityEvent, GameSessionSummary } from '@/types/activity';

const LOCAL_ACTIVITY_KEY = 'glimmind_activity';
const LOCAL_SESSIONS_KEY = 'glimmind_sessions';

function makeEvent(overrides: Partial<CardActivityEvent> = {}): CardActivityEvent {
  return {
    id: crypto.randomUUID(),
    userId: '',
    listId: 'list-1',
    cardId: 'card-1',
    cardTerm: 'term',
    type: 'card_answered',
    at: Date.now(),
    correct: true,
    ...overrides,
  };
}

function makeSession(overrides: Partial<GameSessionSummary> = {}): GameSessionSummary {
  return {
    id: 'session-1',
    listId: 'list-1',
    listName: 'Lista 1',
    startedAt: Date.now(),
    endedAt: Date.now(),
    cardsPlayed: 5,
    correct: 4,
    incorrect: 1,
    byLevel: { nuevas: 0, vistas: 1, reconocidas: 1, conocidas: 2, aprendidas: 1 },
    ...overrides,
  };
}

describe('gameStore activity gate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    useGameStore.setState({
      user: null,
      settings: { ...DEFAULT_SETTINGS },
      activity: [],
      activityNextCursor: undefined,
      activityLoading: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not persist events when activity history is disabled', () => {
    useGameStore.getState().recordActivity([makeEvent()]);
    vi.advanceTimersByTime(5000);
    expect(localStorage.getItem(LOCAL_ACTIVITY_KEY)).toBeNull();
  });

  it('persists events to localStorage when enabled for guests', () => {
    useGameStore.setState({ settings: { activityHistoryEnabled: true } });
    useGameStore.getState().recordActivity([makeEvent()]);
    vi.advanceTimersByTime(5000);
    const saved = JSON.parse(localStorage.getItem(LOCAL_ACTIVITY_KEY) || '[]');
    expect(saved.length).toBe(1);
  });

  it('batches multiple recordActivity calls into a single flush', () => {
    useGameStore.setState({ settings: { activityHistoryEnabled: true } });
    useGameStore.getState().recordActivity([makeEvent()]);
    useGameStore.getState().recordActivity([makeEvent(), makeEvent()]);
    vi.advanceTimersByTime(5000);
    const saved = JSON.parse(localStorage.getItem(LOCAL_ACTIVITY_KEY) || '[]');
    expect(saved.length).toBe(3);
  });

  it('ignores empty event arrays even when enabled', () => {
    useGameStore.setState({ settings: { activityHistoryEnabled: true } });
    useGameStore.getState().recordActivity([]);
    vi.advanceTimersByTime(5000);
    expect(localStorage.getItem(LOCAL_ACTIVITY_KEY)).toBeNull();
  });

  it('clears activity state when history is disabled on loadActivity', async () => {
    useGameStore.setState({ activity: [makeEvent()] });
    await useGameStore.getState().loadActivity();
    expect(useGameStore.getState().activity).toEqual([]);
    expect(useGameStore.getState().activityNextCursor).toBeUndefined();
  });

  it('does not persist sessions when activity history is disabled', () => {
    useGameStore.getState().saveGameSession(makeSession());
    expect(localStorage.getItem(LOCAL_SESSIONS_KEY)).toBeNull();
  });

  it('persists sessions to localStorage when enabled for guests', () => {
    useGameStore.setState({ settings: { activityHistoryEnabled: true } });
    useGameStore.getState().saveGameSession(makeSession());
    const saved = JSON.parse(localStorage.getItem(LOCAL_SESSIONS_KEY) || '[]');
    expect(saved.length).toBe(1);
    expect(saved[0].id).toBe('session-1');
  });
});
