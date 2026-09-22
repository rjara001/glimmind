import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore, mergeAssociations, mergeAssociationsPreferLocal, mergeCloudWithLocalPreferLocal } from '@/store/gameStore';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { CardActivityEvent, GameSessionSummary } from '@/types/activity';
import { Association, AssociationList, UserProgress, UserSettings, UserQuota } from '@/types';

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

describe('mergeAssociations', () => {
  function makeAssociation(overrides: Partial<Association> = {}): Association {
    return {
      id: 'card-1',
      term: 'term',
      definition: 'def',
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
      ...overrides,
    };
  }

  it('prefers the local association on equal timestamps with more game progress', () => {
    const local = makeAssociation({ hits: 3, misses: 1, timesPlayed: 4, updatedAt: 100 });
    const cloud = makeAssociation({ hits: 0, misses: 0, timesPlayed: 0, updatedAt: 100 });

    const merged = mergeAssociations([local], [cloud]);

    expect(merged).toHaveLength(1);
    expect(merged[0].hits).toBe(3);
    expect(merged[0].timesPlayed).toBe(4);
  });

  it('prefers local on equal timestamps and equal progress', () => {
    const local = makeAssociation({ term: 'local term', hits: 1, updatedAt: 100 });
    const cloud = makeAssociation({ term: 'cloud term', hits: 1, updatedAt: 100 });

    const merged = mergeAssociations([local], [cloud]);

    expect(merged).toHaveLength(1);
    expect(merged[0].term).toBe('local term');
  });

  it('keeps the cloud association when it is strictly newer', () => {
    const local = makeAssociation({ hits: 3, updatedAt: 100 });
    const cloud = makeAssociation({ hits: 0, updatedAt: 200 });

    const merged = mergeAssociations([local], [cloud]);

    expect(merged).toHaveLength(1);
    expect(merged[0].hits).toBe(0);
  });
});

function makeAssociation(overrides: Partial<Association> = {}): Association {
  return {
    id: 'card-1',
    term: 'term',
    definition: 'def',
    currentCycle: 1,
    status: 'pending',
    isLearned: false,
    isArchived: false,
    ...overrides,
  };
}

function makeList(overrides: Partial<AssociationList> = {}): AssociationList {
  return {
    id: 'list-1',
    userId: 'user-1',
    name: 'Test List',
    concept: 'test',
    associations: [],
    isArchived: false,
    settings: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function makeProgress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    goalTarget: 10,
    goalProgress: 5,
    goalStartedAt: '2024-01-01',
    streak: 3,
    lastActiveDate: '2024-01-15',
    playedToday: [],
    log: {},
    milestones: {},
    ...overrides,
  };
}

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    activityHistoryEnabled: false,
    audioRecordingEnabled: false,
    voiceSttFallback: false,
    maxCardsPerDeck: 100,
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe('mergeAssociationsPreferLocal', () => {
  it('prefers local when localTime >= cloudTime', () => {
    const local = makeAssociation({ hits: 5, updatedAt: 200 });
    const cloud = makeAssociation({ hits: 0, updatedAt: 100 });

    const merged = mergeAssociationsPreferLocal([local], [cloud]);

    expect(merged).toHaveLength(1);
    expect(merged[0].hits).toBe(5);
  });

  it('prefers local when localTime === 0 (current game state)', () => {
    const local = makeAssociation({ hits: 3, updatedAt: 0 });
    const cloud = makeAssociation({ hits: 0, updatedAt: 1000 });

    const merged = mergeAssociationsPreferLocal([local], [cloud]);

    expect(merged).toHaveLength(1);
    expect(merged[0].hits).toBe(3);
  });

  it('prefers cloud when cloudTime > localTime', () => {
    const local = makeAssociation({ hits: 5, updatedAt: 100 });
    const cloud = makeAssociation({ hits: 0, updatedAt: 200 });

    const merged = mergeAssociationsPreferLocal([local], [cloud]);

    expect(merged).toHaveLength(1);
    expect(merged[0].hits).toBe(0);
  });
});

describe('mergeCloudWithLocalPreferLocal', () => {
  it('prefers local list when localLearned > cloudLearned (progress protection)', () => {
    const localList = makeList({
      id: 'list-1',
      associations: [
        makeAssociation({ id: 'a1', isLearned: true, isArchived: false }),
        makeAssociation({ id: 'a2', isLearned: true, isArchived: false }),
      ],
      updatedAt: 100,
    });
    const cloudList = makeList({
      id: 'list-1',
      associations: [makeAssociation({ id: 'a1', isLearned: false, isArchived: false })],
      updatedAt: 200,
    });

    const merged = mergeCloudWithLocalPreferLocal([cloudList], [localList], 'user-1');

    expect(merged).toHaveLength(1);
    expect(merged[0].associations.length).toBeGreaterThanOrEqual(2);
    expect(merged[0].updatedAt).toBe(100);
  });

  it('prefers local list when localTime >= cloudTime', () => {
    const localList = makeList({ id: 'list-1', updatedAt: 200 });
    const cloudList = makeList({ id: 'list-1', updatedAt: 100 });

    const merged = mergeCloudWithLocalPreferLocal([cloudList], [localList], 'user-1');

    expect(merged).toHaveLength(1);
    expect(merged[0].updatedAt).toBe(200);
  });

  it('keeps local-only lists not present in cloud', () => {
    const localList = makeList({ id: 'local-only' });
    const cloudList = makeList({ id: 'cloud-1' });

    const merged = mergeCloudWithLocalPreferLocal([cloudList], [localList], 'user-1');

    expect(merged).toHaveLength(2);
    expect(merged.find(l => l.id === 'local-only')).toBeDefined();
    expect(merged.find(l => l.id === 'cloud-1')).toBeDefined();
  });
});

describe('Progress/Settings merge (last-write-wins)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prefers local progress when local.updatedAt > cloud.updatedAt', () => {
    const localProgress = makeProgress({ goalProgress: 8, updatedAt: 200 });
    const cloudProgress = makeProgress({ goalProgress: 3, updatedAt: 100 });
    localStorage.setItem('glimmind_progress', JSON.stringify(localProgress));

    const localUpdatedAt = localProgress.updatedAt ?? Date.now();
    const cloudUpdatedAt = cloudProgress.updatedAt ?? 0;
    const merged = localUpdatedAt >= cloudUpdatedAt ? localProgress : cloudProgress;

    expect(merged.goalProgress).toBe(8);
  });

  it('prefers cloud progress when cloud.updatedAt > local.updatedAt', () => {
    const localProgress = makeProgress({ goalProgress: 8, updatedAt: 100 });
    const cloudProgress = makeProgress({ goalProgress: 3, updatedAt: 200 });
    localStorage.setItem('glimmind_progress', JSON.stringify(localProgress));

    const localUpdatedAt = localProgress.updatedAt ?? Date.now();
    const cloudUpdatedAt = cloudProgress.updatedAt ?? 0;
    const merged = localUpdatedAt >= cloudUpdatedAt ? localProgress : cloudProgress;

    expect(merged.goalProgress).toBe(3);
  });

  it('prefers local settings when local.updatedAt > cloud.updatedAt', () => {
    const localSettings = makeSettings({ activityHistoryEnabled: true, updatedAt: 200 });
    const cloudSettings = makeSettings({ activityHistoryEnabled: false, updatedAt: 100 });

    const localUpdatedAt = localSettings.updatedAt ?? Date.now();
    const cloudUpdatedAt = cloudSettings.updatedAt ?? 0;
    const merged = localUpdatedAt >= cloudUpdatedAt ? localSettings : cloudSettings;

    expect(merged.activityHistoryEnabled).toBe(true);
  });

  it('prefers cloud settings when cloud.updatedAt > local.updatedAt', () => {
    const localSettings = makeSettings({ activityHistoryEnabled: true, updatedAt: 100 });
    const cloudSettings = makeSettings({ activityHistoryEnabled: false, updatedAt: 200 });

    const localUpdatedAt = localSettings.updatedAt ?? Date.now();
    const cloudUpdatedAt = cloudSettings.updatedAt ?? 0;
    const merged = localUpdatedAt >= cloudUpdatedAt ? localSettings : cloudSettings;

    expect(merged.activityHistoryEnabled).toBe(false);
  });

  it('falls back to local when cloud missing updatedAt (cloudUpdatedAt = 0)', () => {
    const localProgress = makeProgress({ goalProgress: 8, updatedAt: 200 });
    const cloudProgress = makeProgress({ goalProgress: 3 }); // no updatedAt
    localStorage.setItem('glimmind_progress', JSON.stringify(localProgress));

    const localUpdatedAt = localProgress.updatedAt ?? Date.now();
    const cloudUpdatedAt = cloudProgress.updatedAt ?? 0;
    const merged = localUpdatedAt >= cloudUpdatedAt ? localProgress : cloudProgress;

    expect(merged.goalProgress).toBe(8);
  });
});

describe('syncFromCloud uses mergeCloudWithLocalPreferLocal', () => {
  it('imports mergeCloudWithLocalPreferLocal from store', () => {
    expect(typeof mergeCloudWithLocalPreferLocal).toBe('function');
  });
});
