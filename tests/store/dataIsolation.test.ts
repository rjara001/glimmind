import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { listService } from '@/services/firestoreService';
import { activityService } from '@/services/activityService';
import { isUsingEmulators } from '@/firebase';
import { GUEST_UID } from '@/constants/app';

const CACHE_ENV_KEY = 'glimmind_cache_env';
const CURRENT_ENV = isUsingEmulators ? 'emulator' : 'prod';

const GUEST = { uid: GUEST_UID, displayName: 'Guest', email: null, photoURL: null };
const GOOGLE_USER = { uid: 'google-uid-1', displayName: 'Google', email: 'g@x.com', photoURL: null };

function makeList(id: string, userId: string, name: string) {
  return {
    id,
    userId,
    name,
    concept: 'term / definition',
    associations: [
      { id: `${id}-c1`, term: 'hola', definition: ['hello'], currentCycle: 1, status: 'pending' as const, isLearned: false, isArchived: false },
    ],
    isArchived: false,
    settings: {
      mode: 'training' as const,
      flipOrder: 'normal' as const,
      threshold: 0.95,
      ignoreArticles: true,
      showHints: true,
      autoRevealAfterSeconds: 15,
      autoAdvanceAfterAttempts: 3,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

/**
 * Regression: signing in with Google, signing out, and entering guest mode
 * showed the Google user's decks to the guest.
 */
describe('local data isolation between accounts and guest mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(CACHE_ENV_KEY, CURRENT_ENV);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('guest must not inherit a previous real account’s decks', () => {
    beforeEach(() => {
      localStorage.setItem(
        'glimmind_lists',
        JSON.stringify([
          makeList('google-deck', GOOGLE_USER.uid, 'Private Google Deck'),
          makeList('guest-deck', GUEST_UID, 'My Guest Deck'),
        ])
      );
    });

    it('does not expose the Google user’s deck to a guest', async () => {
      useGameStore.setState({ user: GUEST, lists: [], currentList: null, isLoaded: false });

      await useGameStore.getState().loadInitialData();

      const names = useGameStore.getState().lists.map((l) => l.name);
      expect(names).not.toContain('Private Google Deck');
    });

    it('still shows the guest their own deck', async () => {
      useGameStore.setState({ user: GUEST, lists: [], currentList: null, isLoaded: false });

      await useGameStore.getState().loadInitialData();

      const names = useGameStore.getState().lists.map((l) => l.name);
      expect(names).toContain('My Guest Deck');
    });

    it('does not leak the Google deck into persisted localStorage for the guest', async () => {
      useGameStore.setState({ user: GUEST, lists: [], currentList: null, isLoaded: false });

      await useGameStore.getState().loadInitialData();

      const persisted = JSON.parse(localStorage.getItem('glimmind_lists') || '[]');
      expect(persisted.map((l: { name: string }) => l.name)).not.toContain('Private Google Deck');
    });
  });

  describe('a real account must not see guest decks', () => {
    beforeEach(() => {
      localStorage.setItem(
        'glimmind_lists',
        JSON.stringify([
          makeList('google-deck', GOOGLE_USER.uid, 'Private Google Deck'),
          makeList('guest-deck', GUEST_UID, 'My Guest Deck'),
        ])
      );
      vi.spyOn(listService, 'fetchListsByUser').mockResolvedValue([]);
    });

    it('filters out decks owned by the guest', async () => {
      useGameStore.setState({ user: GOOGLE_USER, lists: [], currentList: null, isLoaded: false });

      await useGameStore.getState().loadInitialData();

      const names = useGameStore.getState().lists.map((l) => l.name);
      expect(names).not.toContain('My Guest Deck');
    });
  });

  describe('switching users in memory', () => {
    it('clears the in-memory lists when the account changes', () => {
      useGameStore.setState({
        user: GOOGLE_USER,
        lists: [makeList('google-deck', GOOGLE_USER.uid, 'Private Google Deck')],
        currentListId: 'google-deck',
        currentList: null,
      });

      useGameStore.getState().setUser(GUEST);

      expect(useGameStore.getState().lists).toEqual([]);
      expect(useGameStore.getState().currentListId).toBeNull();
    });

    it('drops pending activity so it is not flushed under the next account', async () => {
      vi.useFakeTimers();
      const appendSpy = vi
        .spyOn(activityService, 'appendEvents')
        .mockResolvedValue(undefined);
      try {
        useGameStore.setState({
          user: GOOGLE_USER,
          settings: { activityHistoryEnabled: true },
          activityRecordingEnabled: true,
          lists: [],
        });

        useGameStore.getState().recordActivity([
          {
            id: 'evt-1',
            userId: GOOGLE_USER.uid,
            listId: 'google-deck',
            cardId: 'c1',
            cardTerm: 'hola',
            type: 'card_answered',
            at: Date.now(),
            correct: true,
          },
        ]);

        // Switch accounts inside the 1s debounce window.
        useGameStore.getState().setUser(GUEST);
        vi.advanceTimersByTime(5000);

        // The buffer must be dropped, not attributed to the incoming account.
        expect(appendSpy).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });

    it('still flushes activity when the same account keeps recording', async () => {
      vi.useFakeTimers();
      const appendSpy = vi
        .spyOn(activityService, 'appendEvents')
        .mockResolvedValue(undefined);
      try {
        useGameStore.setState({
          user: GOOGLE_USER,
          settings: { activityHistoryEnabled: true },
          activityRecordingEnabled: true,
          lists: [],
        });

        useGameStore.getState().recordActivity([
          {
            id: 'evt-2',
            userId: GOOGLE_USER.uid,
            listId: 'google-deck',
            cardId: 'c1',
            cardTerm: 'hola',
            type: 'card_answered',
            at: Date.now(),
            correct: true,
          },
        ]);
        vi.advanceTimersByTime(5000);

        expect(appendSpy).toHaveBeenCalledWith(GOOGLE_USER.uid, expect.any(Array));
      } finally {
        vi.useRealTimers();
      }
    });
  });
});