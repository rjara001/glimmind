import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppHandlers } from '../../src/hooks/app/useAppHandlers';
import { useGameStore } from '../../src/store/gameStore';
import { QuotaService, quotaService, QUOTA_UNKNOWN_MESSAGE } from '../../src/services/quotaService';
import { listService as firestoreListService } from '../../src/services/firestoreService';
import { activityService } from '../../src/services/activityService';
import type { AppUser, Association, AssociationList } from '../../src/types';
import type { UserQuota, UserTier } from '../../src/types/quota';

// Deck ceiling coverage (maxDecks: free 50, premium 200), both the service
// arithmetic and the client gate in useAppHandlers. The server guard lives in
// backend/src/functions/tests/deckQuota.test.js; the client gate only spares
// the user the round trip.

const user: AppUser = {
  uid: 'u1',
  displayName: 'Test User',
  email: 'u1@example.com',
  photoURL: null,
};

let activeTier: UserTier = 'free';

function buildQuota(tier: UserTier): UserQuota {
  return {
    tier,
    cardCount: 0,
    cardQuota: tier === 'premium' ? 5000 : 1000,
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

function seedDecks(count: number): void {
  useGameStore.setState({
    lists: Array.from({ length: count }, (_, i) => makeList(`l${i}`, [])),
  });
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
    }),
  );
}

describe('QuotaService deck arithmetic', () => {
  it('exposes maxDecks per tier from plans.json', () => {
    expect(QuotaService.getMaxDecks('free')).toBe(50);
    expect(QuotaService.getMaxDecks('premium')).toBe(200);
    expect(QuotaService.getMaxDecks()).toBe(50);
  });

  it('allows the count that lands exactly on the ceiling', () => {
    expect(QuotaService.canAddDecks(49, 1, 'free')).toBe(true);
    expect(QuotaService.canAddDecks(50, 1, 'free')).toBe(false);
    expect(QuotaService.canAddDecks(199, 1, 'premium')).toBe(true);
    expect(QuotaService.canAddDecks(200, 1, 'premium')).toBe(false);
  });

  it('treats the ceiling as an inclusive bound', () => {
    // The "never block removal" rule lives where deltas are judged, not in the
    // arithmetic: deckGate (client) and assertDeckQuotaHasRoom (server) both
    // no-op on non-positive deltas.
    expect(QuotaService.canAddDecks(60, 1, 'free')).toBe(false);
    expect(QuotaService.canAddDecks(50, 0, 'free')).toBe(true);
  });
});

describe('deck gate in useAppHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeTier = 'free';
    vi.spyOn(quotaService, 'fetchQuota').mockImplementation(async () => buildQuota(activeTier));
    vi.spyOn(firestoreListService, 'createList').mockResolvedValue('list-1');
    vi.spyOn(firestoreListService, 'bulkCreateLists').mockImplementation(async (input) => {
      const deckSize = input.cardsPerDeck ?? 100;
      const chunks = Math.ceil(input.associations.length / deckSize);
      return Array.from({ length: chunks }, (_, i) => `bulk-${i}`);
    });
    vi.spyOn(firestoreListService, 'splitList').mockResolvedValue(['orig', 'new-1']);
    vi.spyOn(firestoreListService, 'getList').mockResolvedValue(makeList('orig', []));
    vi.spyOn(firestoreListService, 'fetchListsByUser').mockResolvedValue([]);
    vi.spyOn(activityService, 'recordCardsCreated').mockResolvedValue(undefined);
    vi.spyOn(activityService, 'recordEvents').mockResolvedValue(undefined);
    useGameStore.setState({
      user,
      lists: [],
      currentListId: null,
      quota: buildQuota('free'),
      isLoaded: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refuses the 51st free deck and never calls the service', async () => {
    seedDecks(50);
    const { result } = renderHandlers();

    let createdId: string | null = 'pending';
    await act(async () => {
      createdId = await result.current.handleCreateList('One', 'term / definition', []);
    });

    expect(createdId).toBeNull();
    expect(firestoreListService.createList).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/límite de 50 mazos/),
      'error',
    );
  });

  it('accepts the 50th free deck', async () => {
    seedDecks(49);
    const { result } = renderHandlers();

    let createdId: string | null = null;
    await act(async () => {
      createdId = await result.current.handleCreateList('Fifty', 'term / definition', []);
    });

    expect(createdId).toBe('list-1');
    expect(firestoreListService.createList).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('Mazo creado', 'success');
  });

  it('refuses a premium user past 200 decks', async () => {
    activeTier = 'premium';
    useGameStore.setState({ quota: buildQuota('premium') });
    seedDecks(200);
    const { result } = renderHandlers();

    let createdId: string | null = 'pending';
    await act(async () => {
      createdId = await result.current.handleCreateList('One', 'term / definition', []);
    });

    expect(createdId).toBeNull();
    expect(firestoreListService.createList).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/límite de 200 mazos/),
      'error',
    );
  });

  it('gates a bulk import by the number of decks it fans out to', async () => {
    // 49 decks + ceil(250/100) = 3 new decks = 52 > 50.
    seedDecks(49);
    const { result } = renderHandlers();

    let ids: string[] | null = ['pending'];
    await act(async () => {
      ids = await result.current.handleBulkCreateLists({
        userId: user.uid,
        name: 'Bulk',
        concept: 'term / definition',
        associations: makeCards(250),
        settings: {},
      });
    });

    expect(ids).toBeNull();
    expect(firestoreListService.bulkCreateLists).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/límite de 50 mazos/),
      'error',
    );
  });

  it('gates a split by the new decks the extra groups create', async () => {
    // groups[0] rewrites the original; groups[1..2] are 2 new decks.
    // 49 + 2 = 51 > 50.
    seedDecks(49);
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleCreateMultipleLists(
        [
          { name: 'G1', associations: makeCards(2) },
          { name: 'G2', associations: makeCards(2) },
          { name: 'G3', associations: makeCards(2) },
        ],
        'orig',
      );
    });

    expect(firestoreListService.splitList).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.stringMatching(/límite de 50 mazos/),
      'error',
    );
  });

  it('allows a split whose extra groups stay inside the ceiling', async () => {
    seedDecks(48);
    const { result } = renderHandlers();

    await act(async () => {
      await result.current.handleCreateMultipleLists(
        [
          { name: 'G1', associations: makeCards(2) },
          { name: 'G2', associations: makeCards(2) },
        ],
        'orig',
      );
    });

    expect(firestoreListService.splitList).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith('Mazos divididos correctamente', 'success');
  });

  it('refuses deck creation while the tier is unknown instead of guessing free', async () => {
    useGameStore.setState({ quota: null });
    seedDecks(1);
    const { result } = renderHandlers();

    let createdId: string | null = 'pending';
    await act(async () => {
      createdId = await result.current.handleCreateList('X', 'term / definition', []);
    });

    expect(createdId).toBeNull();
    expect(firestoreListService.createList).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(QUOTA_UNKNOWN_MESSAGE, 'error');
  });
});
