import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { listService } from '@/services/firestoreService';
import { isUsingEmulators } from '@/firebase';
import { GUEST_UID } from '@/constants/app';

// loadInitialData calls ensureCacheMatchesEnvironment(), which wipes glimmind_lists
// unless glimmind_cache_env already matches the current environment.
const CACHE_ENV_KEY = 'glimmind_cache_env';
const CURRENT_ENV = isUsingEmulators ? 'emulator' : 'prod';

const GUEST = {
  uid: GUEST_UID,
  displayName: 'Guest',
  email: null,
  photoURL: null,
};

const REAL_USER = {
  uid: 'real-user-1',
  displayName: 'Real',
  email: 'a@b.c',
  photoURL: null,
};

/** The cloud shape that produced "Q is not iterable" in production. */
const malformedList = {
  id: 'broken-list',
  userId: REAL_USER.uid,
  name: 'Broken',
  concept: 'term / definition',
  // NOT an array — a keyed map, as Firestore returns for subcollections
  associations: {
    'card-1': { id: 'card-1', term: 'hola', definition: ['hello'] },
    'card-2': { id: 'card-2', term: 'adios', definition: ['bye'] },
  },
  isArchived: false,
  settings: {},
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const goodList = {
  ...malformedList,
  associations: [
    { id: 'card-1', term: 'hola', definition: ['hello'], currentCycle: 1, status: 'pending', isLearned: false, isArchived: false },
  ],
};

let errorSpy: ReturnType<typeof vi.spyOn>;

describe('loadInitialData robustness against malformed cloud data', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(CACHE_ENV_KEY, CURRENT_ENV);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  /**
   * Every failure path in loadInitialData is swallowed by a catch and logged,
   * so the promise resolving proves nothing. Assert nothing was logged at all.
   */
  function expectNoLoadFailure() {
    expect(errorSpy).not.toHaveBeenCalled();
  }

  describe('authenticated user (the path that failed in production)', () => {
    beforeEach(() => {
      localStorage.removeItem('glimmind_lists');
      useGameStore.setState({
        user: REAL_USER,
        lists: [],
        currentList: null,
        isLoaded: false,
        quota: null,
        settings: { activityHistoryEnabled: false, audioRecordingEnabled: false, voiceSttFallback: false, maxCardsPerDeck: 100 },
      });
    });

    it('does not fail when a cloud list has object-shaped associations', async () => {
      vi.spyOn(listService, 'fetchListsByUser').mockResolvedValue([
        malformedList as never,
      ]);

      await useGameStore.getState().loadInitialData();

      expectNoLoadFailure();
    });

    it('keeps the cloud list instead of dropping it on the floor', async () => {
      vi.spyOn(listService, 'fetchListsByUser').mockResolvedValue([
        malformedList as never,
      ]);

      await useGameStore.getState().loadInitialData();

      const loaded = useGameStore.getState().lists.find((l) => l.id === 'broken-list');
      expect(loaded).toBeDefined();
      expect(loaded?.associations).toEqual([]);
    });

    it('still loads a well-formed cloud list unchanged', async () => {
      vi.spyOn(listService, 'fetchListsByUser').mockResolvedValue([goodList as never]);

      await useGameStore.getState().loadInitialData();

      const loaded = useGameStore.getState().lists.find((l) => l.id === 'broken-list');
      expect(loaded?.associations).toHaveLength(1);
      expectNoLoadFailure();
    });
  });

  describe('guest user (localStorage path)', () => {
    beforeEach(() => {
      useGameStore.setState({ user: GUEST, lists: [], currentList: null, isLoaded: false });
    });

    function seed(payload: unknown) {
      useGameStore.setState({ user: GUEST, lists: [], currentList: null, isLoaded: false });
      localStorage.setItem(CACHE_ENV_KEY, CURRENT_ENV);
      localStorage.setItem('glimmind_lists', JSON.stringify(payload));
    }

    it('survives object-shaped associations in localStorage', async () => {
      // Guests only see lists they own, so the fixture must be guest-owned.
      seed([{ ...malformedList, userId: GUEST_UID }]);

      await useGameStore.getState().loadInitialData();

      expectNoLoadFailure();
      const loaded = useGameStore.getState().lists.find((l) => l.id === 'broken-list');
      expect(loaded?.associations).toEqual([]);
    });

    it('survives a payload that is not an array at all', async () => {
      seed({ notAnArray: true });

      await expect(useGameStore.getState().loadInitialData()).resolves.toBeUndefined();
      expectNoLoadFailure();
    });

    it('survives a null payload', async () => {
      seed(null);

      await expect(useGameStore.getState().loadInitialData()).resolves.toBeUndefined();
      expectNoLoadFailure();
    });
  });
});