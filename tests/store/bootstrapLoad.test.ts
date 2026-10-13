import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { listService } from '@/services/firestoreService';
import { quotaService } from '@/services/quotaService';
import { settingsService } from '@/services/settingsService';
import { isUsingEmulators } from '@/firebase';
import { GUEST_UID } from '@/constants/app';
import { LIST_CACHE_TTL_MS } from '@/constants/limits';
import { createInitialBootstrapStatus } from '@/types/bootstrap-status';
import type { AssociationList } from '@/types';

const CACHE_ENV_KEY = 'glimmind_cache_env';
const CURRENT_ENV = isUsingEmulators ? 'emulator' : 'prod';
const MARKER_KEY = 'glimmind_last_cloud_fetch';

const REAL_USER = {
  uid: 'real-user-1',
  displayName: 'Real',
  email: 'a@b.c',
  photoURL: null,
};

const GUEST = { uid: GUEST_UID, displayName: 'Guest', email: null, photoURL: null };

function makeList(id: string, userId: string): AssociationList {
  return {
    id,
    userId,
    name: `Deck ${id}`,
    concept: 'term / definition',
    associations: [
      {
        id: `${id}-c1`,
        term: 'hola',
        definition: ['hello'],
        currentCycle: 1,
        status: 'pending',
        isLearned: false,
        isArchived: false,
      },
    ],
    isArchived: false,
    settings: {
      mode: 'training',
      flipOrder: 'normal',
      threshold: 0.95,
      ignoreArticles: true,
      showHints: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as AssociationList;
}

function markerKey(uid: string): string {
  return `${MARKER_KEY}_${uid}`;
}

function seedStore(overrides: Record<string, unknown>) {
  useGameStore.setState({
    lists: [],
    currentListId: null,
    currentList: null,
    isLoaded: false,
    isLoading: false,
    bootstrapStatus: createInitialBootstrapStatus(),
    quota: null,
    ...overrides,
  });
}

describe('bootstrap load (loadInitialData)', () => {
  let listsSpy: ReturnType<typeof vi.spyOn>;
  let quotaSpy: ReturnType<typeof vi.spyOn>;
  let fetchSettingsSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem(CACHE_ENV_KEY, CURRENT_ENV);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    listsSpy = vi.spyOn(listService, 'fetchListsByUser').mockResolvedValue([]);
    quotaSpy = vi
      .spyOn(quotaService, 'fetchQuota')
      .mockResolvedValue({ tier: 'free' } as never);
    fetchSettingsSpy = vi.spyOn(settingsService, 'fetchSettings').mockResolvedValue(null);
    vi.spyOn(settingsService, 'saveSettings').mockResolvedValue(undefined);
    vi.spyOn(settingsService, 'saveLocalSettings').mockReturnValue(undefined);
  });

  describe('F1: auth still resolving (user === null)', () => {
    it('does not wipe the signed-in user local deck cache', async () => {
      const decks = [makeList('deck-1', REAL_USER.uid)];
      localStorage.setItem('glimmind_lists', JSON.stringify(decks));
      seedStore({ user: null });

      await useGameStore.getState().loadInitialData();

      const stored = JSON.parse(localStorage.getItem('glimmind_lists') || '[]');
      expect(stored.map((l: AssociationList) => l.id)).toEqual(['deck-1']);
      expect(useGameStore.getState().isLoaded).toBe(true);
      expect(useGameStore.getState().bootstrapStatus.lists).toBe('idle');
      expect(listsSpy).not.toHaveBeenCalled();
    });
  });

  describe('F1b: empty local cache never counts as a fresh cache', () => {
    it('calls getLists even when the TTL marker is still fresh', async () => {
      localStorage.setItem('glimmind_lists', JSON.stringify([]));
      localStorage.setItem(markerKey(REAL_USER.uid), String(Date.now()));
      seedStore({ user: REAL_USER });

      await useGameStore.getState().loadInitialData();

      expect(listsSpy).toHaveBeenCalledWith(REAL_USER.uid);
      expect(useGameStore.getState().bootstrapStatus.lists).toBe('loaded');
    });

    it('skips getLists on a fresh TTL but still loads quota and settings', async () => {
      localStorage.setItem('glimmind_lists', JSON.stringify([makeList('deck-1', REAL_USER.uid)]));
      localStorage.setItem(markerKey(REAL_USER.uid), String(Date.now()));
      seedStore({ user: REAL_USER });

      await useGameStore.getState().loadInitialData();

      expect(listsSpy).not.toHaveBeenCalled();
      expect(quotaSpy).toHaveBeenCalledWith(REAL_USER.uid);
      expect(fetchSettingsSpy).toHaveBeenCalledWith(REAL_USER.uid);
      const status = useGameStore.getState().bootstrapStatus;
      expect(status.lists).toBe('loaded');
      expect(status.quota).toBe('loaded');
      expect(status.settings).toBe('loaded');
    });
  });

  describe('F2: a failed getLists does not seal the TTL', () => {
    it('marks the lists phase as error and keeps the previous marker', async () => {
      const previousMarker = String(Date.now() - LIST_CACHE_TTL_MS - 1_000);
      localStorage.setItem(markerKey(REAL_USER.uid), previousMarker);
      localStorage.setItem('glimmind_lists', JSON.stringify([makeList('deck-1', REAL_USER.uid)]));
      listsSpy.mockRejectedValue(new Error('HTTP 500'));
      seedStore({ user: REAL_USER });

      await useGameStore.getState().loadInitialData();

      expect(listsSpy).toHaveBeenCalled();
      expect(localStorage.getItem(markerKey(REAL_USER.uid))).toBe(previousMarker);
      const status = useGameStore.getState().bootstrapStatus;
      expect(status.lists).toBe('error');
      expect(status.error).toContain('HTTP 500');
      expect(status.quota).toBe('loaded');
      expect(status.settings).toBe('loaded');
    });
  });

  describe('F3: cache environment switches drop the per-uid TTL markers', () => {
    it('clears the stale marker and refetches when the cache environment mismatches', async () => {
      const staleMarker = String(Date.now() - 60_000);
      localStorage.setItem(markerKey(REAL_USER.uid), staleMarker);
      localStorage.setItem('glimmind_lists', JSON.stringify([makeList('deck-1', REAL_USER.uid)]));
      localStorage.setItem(CACHE_ENV_KEY, CURRENT_ENV === 'emulator' ? 'prod' : 'emulator');
      seedStore({ user: REAL_USER });

      await useGameStore.getState().loadInitialData();

      expect(listsSpy).toHaveBeenCalled();
      const refreshedMarker = localStorage.getItem(markerKey(REAL_USER.uid));
      expect(refreshedMarker).not.toBeNull();
      expect(refreshedMarker).not.toBe(staleMarker);
    });
  });

  describe('guests stay local', () => {
    it('marks every part as loaded without calling the cloud', async () => {
      localStorage.setItem('glimmind_lists', JSON.stringify([makeList('guest-deck', GUEST_UID)]));
      seedStore({ user: GUEST });

      await useGameStore.getState().loadInitialData();

      expect(listsSpy).not.toHaveBeenCalled();
      expect(quotaSpy).not.toHaveBeenCalled();
      expect(fetchSettingsSpy).not.toHaveBeenCalled();
      const status = useGameStore.getState().bootstrapStatus;
      expect(status.lists).toBe('loaded');
      expect(status.quota).toBe('loaded');
      expect(status.settings).toBe('loaded');
      expect(status.sync).toBe('loaded');
      expect(useGameStore.getState().lists.map((l) => l.id)).toEqual(['guest-deck']);
    });
  });

  describe('retryBootstrapPart', () => {
    it('refetches getLists and flips the phase back to loaded', async () => {
      localStorage.setItem('glimmind_lists', JSON.stringify([makeList('deck-1', REAL_USER.uid)]));
      localStorage.setItem(markerKey(REAL_USER.uid), String(Date.now()));
      listsSpy.mockResolvedValue([makeList('deck-cloud', REAL_USER.uid)]);
      seedStore({
        user: REAL_USER,
        bootstrapStatus: { ...createInitialBootstrapStatus(), lists: 'error' },
      });

      await useGameStore.getState().retryBootstrapPart('lists');

      expect(listsSpy).toHaveBeenCalledWith(REAL_USER.uid);
      const status = useGameStore.getState().bootstrapStatus;
      expect(status.lists).toBe('loaded');
      expect(useGameStore.getState().lists.map((l) => l.id)).toContain('deck-cloud');
    });

    it('is a no-op for guests', async () => {
      seedStore({ user: GUEST });

      await useGameStore.getState().retryBootstrapPart('lists');

      expect(listsSpy).not.toHaveBeenCalled();
    });
  });
});
