import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppHandlers } from '../../src/hooks/app/useAppHandlers';
import { useGameStore } from '../../src/store/gameStore';
import { QuotaService, quotaService } from '../../src/services/quotaService';
import { listService as firestoreListService } from '../../src/services/firestoreService';
import { activityService } from '../../src/services/activityService';
import type { AppUser, Association, AssociationList } from '../../src/types';
import type { TierType } from '../../src/constants/quotaConfig';
import type { UserQuota, UserTier } from '../../src/types/quota';

const FREE_MAX_CARDS = 10;
const PREMIUM_MAX_CARDS = 20;

const QUOTA_ERROR_PATTERN = /quota exceeded.*\b(?:10|20)\b/i;
const QUOTA_TOAST_PATTERN = /quota|límite/i;

const user: AppUser = {
  uid: 'u1',
  displayName: 'Test User',
  email: 'u1@example.com',
  photoURL: null,
};

let activeTier: UserTier = 'premium';

function buildQuota(tier: UserTier): UserQuota {
  return {
    tier,
    cardCount: 0,
    cardQuota: tier === 'premium' ? PREMIUM_MAX_CARDS : FREE_MAX_CARDS,
    aiQuotaDaily: 100,
    aiUsedToday: 0,
    ytAiUsedToday: 0,
    ytAiDailyLimit: 0,
    translationCharsUsed: 0,
    translationCharLimit: 0,
  };
}

function makeCards(count: number): Association[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `card-${i}`,
    term: `term-${i}`,
    definition: [`def-${i}`],
    currentCycle: 1,
    status: 'pending' as const,
    isLearned: false,
    isArchived: false,
  }));
}

function makeList(id: string, associations: Association[]): AssociationList {
  return {
    id,
    userId: user.uid,
    name: `deck-${id}`,
    concept: 'term / definition',
    associations,
    isArchived: false,
    settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
    createdAt: 1,
    updatedAt: 1,
  };
}

const mockNavigate = vi.fn();
const mockShowToast = vi.fn();
const mockSetLastPlayedId = vi.fn();

function renderHandlers() {
  return renderHook(() =>
    useAppHandlers({
      navigate: mockNavigate,
      showToast: mockShowToast,
      setLastPlayedId: mockSetLastPlayedId,
    })
  );
}

describe('bulk import quota harness (injected limits: free=10, premium=20)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeTier = 'premium';
    vi.spyOn(QuotaService, 'getMaxCards').mockImplementation(
      (tier: TierType = 'free') => (tier === 'premium' ? PREMIUM_MAX_CARDS : FREE_MAX_CARDS),
    );
    vi.spyOn(quotaService, 'fetchQuota').mockImplementation(async () => buildQuota(activeTier));
    vi.spyOn(firestoreListService, 'createList').mockResolvedValue('list-1');
    vi.spyOn(firestoreListService, 'updateList').mockResolvedValue(undefined);
    vi.spyOn(firestoreListService, 'getList').mockResolvedValue(makeList('existing', []));
    vi.spyOn(activityService, 'recordCardsCreated').mockResolvedValue(undefined);
    vi.spyOn(activityService, 'recordEvents').mockResolvedValue(undefined);
    useGameStore.setState({
      user,
      lists: [],
      currentListId: null,
      quota: null,
      isLoaded: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('scenario 1: a single load of 30 cards shows the quota-exceeded toast', () => {
    it('refuses createList for a premium user and toasts the quota error', async () => {
      activeTier = 'premium';
      const { result } = renderHandlers();

      let createdId: string | null = 'pending';
      await act(async () => {
        createdId = await result.current.handleCreateList(
          'Bulk',
          'term / definition',
          makeCards(30),
        );
      });

      expect(createdId).toBeNull();
      expect(firestoreListService.createList).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(QUOTA_ERROR_PATTERN),
        'error',
      );
    });

    it('refuses updateList for a premium user and toasts the quota error', async () => {
      activeTier = 'premium';
      const { result } = renderHandlers();

      let thrown: unknown = null;
      try {
        await act(async () => {
          await result.current.handleUpdateList(makeList('existing', makeCards(30)));
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(Error);
      expect(firestoreListService.updateList).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(QUOTA_ERROR_PATTERN),
        'error',
      );
    });
  });

  describe('scenario 2: a free user loads exactly 10 cards without a quota toast', () => {
    it('creates a 10-card list for a free user', async () => {
      activeTier = 'free';
      const { result } = renderHandlers();

      let createdId: string | null = null;
      await act(async () => {
        createdId = await result.current.handleCreateList(
          'Bulk',
          'term / definition',
          makeCards(10),
        );
      });

      expect(createdId).toBe('list-1');
      expect(firestoreListService.createList).toHaveBeenCalledTimes(1);
      const payload = firestoreListService.createList.mock.calls[0][0];
      expect(payload.associations).toHaveLength(10);
      expect(mockShowToast).toHaveBeenCalledWith('Mazo creado', 'success');
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.stringMatching(QUOTA_TOAST_PATTERN),
        'error',
      );
    });

    it('updates a deck to exactly 10 cards for a free user', async () => {
      activeTier = 'free';
      const { result } = renderHandlers();

      await act(async () => {
        await result.current.handleUpdateList(makeList('existing', makeCards(10)));
      });

      expect(firestoreListService.updateList).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith('Lista guardada', 'success');
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.stringMatching(QUOTA_TOAST_PATTERN),
        'error',
      );
    });
  });

  describe('scenario 3: a premium user loads exactly 20 cards without a quota toast', () => {
    it('creates a 20-card list for a premium user', async () => {
      activeTier = 'premium';
      const { result } = renderHandlers();

      let createdId: string | null = null;
      await act(async () => {
        createdId = await result.current.handleCreateList(
          'Bulk',
          'term / definition',
          makeCards(20),
        );
      });

      expect(createdId).toBe('list-1');
      expect(firestoreListService.createList).toHaveBeenCalledTimes(1);
      const payload = firestoreListService.createList.mock.calls[0][0];
      expect(payload.associations).toHaveLength(20);
      expect(mockShowToast).toHaveBeenCalledWith('Mazo creado', 'success');
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.stringMatching(QUOTA_TOAST_PATTERN),
        'error',
      );
    });

    it('updates a deck to exactly 20 cards for a premium user', async () => {
      activeTier = 'premium';
      const { result } = renderHandlers();

      await act(async () => {
        await result.current.handleUpdateList(makeList('existing', makeCards(20)));
      });

      expect(firestoreListService.updateList).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith('Lista guardada', 'success');
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.stringMatching(QUOTA_TOAST_PATTERN),
        'error',
      );
    });
  });
});
