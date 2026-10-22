import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppHandlers } from '../../src/hooks/app/useAppHandlers';
import { useListEditorActions } from '../../src/hooks/dashboard/useListEditorActions';
import type { UseListEditorActionsParams } from '../../src/hooks/dashboard/useListEditorActions';
import { useGameStore } from '../../src/store/gameStore';
import { QuotaService, quotaService } from '../../src/services/quotaService';
import { listService as firestoreListService } from '../../src/services/firestoreService';
import { activityService } from '../../src/services/activityService';
import type { AppUser, Association, AssociationList } from '../../src/types';
import type { ImportValidationResult } from '../../src/services/importValidationService';
import type { TierType } from '../../src/constants/quotaConfig';
import type { UserQuota, UserTier } from '../../src/types/quota';
import { GUEST_UID } from '../../src/constants/app';
import { MAX_CARDS_PER_DECK } from '../../src/constants/limits';

// Injected harness limits. Card accounting is a product decision documented in
// docs/BUSINESS_MODEL.md; the values below only drive these tests.
const FREE_MAX_CARDS = 10;
const PREMIUM_MAX_CARDS = 1000;

const user: AppUser = {
  uid: 'u1',
  displayName: 'Test User',
  email: 'u1@example.com',
  photoURL: null,
};

const guestUser: AppUser = {
  uid: GUEST_UID,
  displayName: 'Local Guest',
  email: null,
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

function makeList(id: string, associations: Association[], name = `deck-${id}`): AssociationList {
  return {
    id,
    userId: user.uid,
    name,
    concept: 'term / definition',
    associations,
    isArchived: false,
    settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
    createdAt: 1,
    updatedAt: 1,
  };
}

function makeValidationResult(count: number): ImportValidationResult {
  return {
    total: count,
    counts: { existing: 0, similar: 0, new: count },
    categorized: Array.from({ length: count }, (_, i) => ({
      card: { term: `term-${i}`, definition: `def-${i}` },
      category: 'new' as const,
    })),
    existingTerms: new Set<string>(),
  };
}

function renderImportActions(overrides: Partial<UseListEditorActionsParams> = {}) {
  const params: UseListEditorActionsParams = {
    editList: makeList('', makeCards(2), 'Imported'),
    setEditList: vi.fn(),
    selectedIds: new Set<string>(),
    selectedArchivedIds: new Set<string>(),
    onSave: vi.fn().mockResolvedValue(undefined),
    onCreateMultiple: vi.fn().mockResolvedValue(undefined),
    isCreateMode: true,
    onBulkCreate: vi.fn().mockResolvedValue(['id1', 'id2']),
    showToast: mockShowToast,
    translateLang: 'en',
    lists: [],
    isSaving: false,
    setIsSaving: vi.fn(),
    setNameError: vi.fn(),
    validationResult: makeValidationResult(150),
    setValidationResult: vi.fn(),
    setShowValidationScreen: vi.fn(),
    setSelectedIds: vi.fn(),
    setSelectedArchivedIds: vi.fn(),
    onBack: vi.fn(),
    csvHeader: ['Term', 'Definition', 'Context'],
    setTranslationUsed: vi.fn(),
    setIsTranslating: vi.fn(),
    isImporting: false,
    setIsImporting: vi.fn(),
    importLimit: null,
    setImportLimit: vi.fn(),
    isValidating: false,
    setIsValidating: vi.fn(),
    setValidationProgress: vi.fn(),
    ...overrides,
  };
  return renderHook(() => useListEditorActions(params));
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

describe('single bulk import (one HTTP request for the whole payload)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeTier = 'premium';
    vi.spyOn(QuotaService, 'getMaxCards').mockImplementation(
      (tier: TierType = 'free') => (tier === 'premium' ? PREMIUM_MAX_CARDS : FREE_MAX_CARDS),
    );
    vi.spyOn(quotaService, 'fetchQuota').mockImplementation(async () => buildQuota(activeTier));
    vi.spyOn(firestoreListService, 'bulkCreateLists').mockResolvedValue(['l1', 'l2', 'l3']);
    vi.spyOn(activityService, 'recordEvents').mockResolvedValue(undefined);
    useGameStore.setState({
      user,
      lists: [],
      currentListId: null,
      // The deck gate reads the store quota; null for a signed-in user means
      // "unknown" and blocks deck creation before any import runs.
      quota: buildQuota(activeTier),
      isLoaded: true,
      isLoading: false,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('handleBulkCreateLists', () => {
    it('sends 250 cards as ONE request and splits the local store into 3 decks', async () => {
      const { result } = renderHandlers();

      let ids: string[] | null = null;
      await act(async () => {
        ids = await result.current.handleBulkCreateLists({
          name: 'Bulk',
          concept: 'term / definition',
          associations: makeCards(250),
        });
      });

      expect(ids).toEqual(['l1', 'l2', 'l3']);
      expect(firestoreListService.bulkCreateLists).toHaveBeenCalledTimes(1);

      const payload = firestoreListService.bulkCreateLists.mock.calls[0][0];
      expect(payload.associations).toHaveLength(250);
      expect(payload.cardsPerDeck).toBe(MAX_CARDS_PER_DECK);
      expect(payload.userId).toBe(user.uid);

      const lists = useGameStore.getState().lists;
      expect(lists.map((l) => l.name)).toEqual(['Bulk', 'Bulk-2', 'Bulk-3']);
      expect(lists.map((l) => l.associations.length)).toEqual([100, 100, 50]);
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.stringMatching(/quota|límite/i),
        'error',
      );
    });

    it('refuses a 30-card import against the injected premium limit of 20 with zero HTTP calls', async () => {
      const limited = { ...buildQuota('premium'), cardQuota: 20 };
      vi.spyOn(QuotaService, 'getMaxCards').mockImplementation(
        (tier: TierType = 'free') => (tier === 'premium' ? 20 : FREE_MAX_CARDS),
      );
      vi.spyOn(quotaService, 'fetchQuota').mockImplementation(async () => limited);
      const { result } = renderHandlers();

      let ids: string[] | null = 'pending';
      await act(async () => {
        ids = await result.current.handleBulkCreateLists({
          name: 'Bulk',
          concept: 'term / definition',
          associations: makeCards(30),
        });
      });

      expect(ids).toBeNull();
      expect(firestoreListService.bulkCreateLists).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/quota exceeded.*\b20\b/i),
        'error',
      );
      expect(useGameStore.getState().lists).toHaveLength(0);
    });

    it('surfaces one clear toast when the single request fails', async () => {
      vi.spyOn(firestoreListService, 'bulkCreateLists').mockRejectedValue(
        new Error('Rate limit exceeded. Try again after 45 seconds.'),
      );
      const { result } = renderHandlers();

      let ids: string[] | null = 'pending';
      await act(async () => {
        ids = await result.current.handleBulkCreateLists({
          name: 'Bulk',
          concept: 'term / definition',
          associations: makeCards(30),
        });
      });

      expect(ids).toBeNull();
      expect(firestoreListService.bulkCreateLists).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        'Rate limit exceeded. Try again after 45 seconds.',
        'error',
      );
      expect(useGameStore.getState().lists).toHaveLength(0);
    });

    it('keeps guests local-only: no HTTP call, decks built in the store', async () => {
      useGameStore.setState({ user: guestUser });
      const { result } = renderHandlers();

      let ids: string[] | null = null;
      await act(async () => {
        ids = await result.current.handleBulkCreateLists({
          name: 'Guest import',
          concept: 'term / definition',
          associations: makeCards(150),
        });
      });

      expect(ids).toHaveLength(2);
      expect(firestoreListService.bulkCreateLists).not.toHaveBeenCalled();
      const lists = useGameStore.getState().lists;
      expect(lists.map((l) => l.associations.length)).toEqual([100, 50]);
      expect(lists.every((l) => l.userId === GUEST_UID)).toBe(true);
    });
  });

  describe('importSelectedCards in create mode', () => {
    it('performs a single onBulkCreate call carrying every card, including rows already in the editor', async () => {
      const onBulkCreate = vi.fn().mockResolvedValue(['id1', 'id2']);
      const setShowValidationScreen = vi.fn();
      const onBack = vi.fn();
      const { result } = renderImportActions({
        onBulkCreate,
        setShowValidationScreen,
        onBack,
      });

      await act(async () => {
        await result.current.importSelectedCards({
          existing: false,
          similar: false,
          new: true,
        });
      });

      expect(onBulkCreate).toHaveBeenCalledTimes(1);
      const payload = onBulkCreate.mock.calls[0][0];
      expect(payload.name).toBe('Imported');
      expect(payload.associations).toHaveLength(152);
      expect(payload.cardsPerDeck).toBe(MAX_CARDS_PER_DECK);
      expect(setShowValidationScreen).toHaveBeenCalledWith(false);
      expect(onBack).toHaveBeenCalledTimes(1);
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/150 tarjetas importadas en 2 mazos/),
        'success',
      );
    });

    it('shows a single toast and closes validation when the bulk request fails', async () => {
      const onBulkCreate = vi.fn().mockResolvedValue(null);
      const setShowValidationScreen = vi.fn();
      const onBack = vi.fn();
      const { result } = renderImportActions({
        onBulkCreate,
        setShowValidationScreen,
        onBack,
      });

      await act(async () => {
        await result.current.importSelectedCards({
          existing: false,
          similar: false,
          new: true,
        });
      });

      expect(onBulkCreate).toHaveBeenCalledTimes(1);
      expect(setShowValidationScreen).toHaveBeenCalledWith(false);
      expect(onBack).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.stringMatching(/importadas/),
        'success',
      );
    });

    it('truncates create-mode import to importLimit and reports discarded cards in the toast', async () => {
      const onBulkCreate = vi.fn().mockResolvedValue(['id1']);
      const { result } = renderImportActions({
        onBulkCreate,
        importLimit: 20,
      });

      await act(async () => {
        await result.current.importSelectedCards({
          existing: false,
          similar: false,
          new: true,
        });
      });

      expect(onBulkCreate).toHaveBeenCalledTimes(1);
      const payload = onBulkCreate.mock.calls[0][0];
      expect(payload.associations).toHaveLength(22);
      expect(payload.associations.slice(0, 2).map((a: Association) => a.id)).toEqual([
        'card-0',
        'card-1',
      ]);
      expect(payload.associations.slice(2).map((a: Association) => a.term)).toEqual(
        Array.from({ length: 20 }, (_, i) => `term-${i}`),
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/20 tarjetas importadas \(130 fuera por tu límite\)/),
        'success',
      );
    });

    it('edit mode still splits through onCreateMultiple and never calls the bulk endpoint', async () => {
      const onCreateMultiple = vi.fn().mockResolvedValue(undefined);
      const onBulkCreate = vi.fn();
      const { result } = renderImportActions({
        isCreateMode: false,
        onCreateMultiple,
        onBulkCreate,
      });

      await act(async () => {
        await result.current.importSelectedCards({
          existing: false,
          similar: false,
          new: true,
        });
      });

      expect(onCreateMultiple).toHaveBeenCalledTimes(1);
      expect(onBulkCreate).not.toHaveBeenCalled();
    });

    it('edit mode truncates the append to importLimit via onSave', async () => {
      const onSave = vi.fn().mockResolvedValue(undefined);
      const { result } = renderImportActions({
        isCreateMode: false,
        onSave,
        importLimit: 10,
      });

      await act(async () => {
        await result.current.importSelectedCards({
          existing: false,
          similar: false,
          new: true,
        });
      });

      expect(onSave).toHaveBeenCalledTimes(1);
      const saved = onSave.mock.calls[0][0] as AssociationList;
      expect(saved.associations).toHaveLength(12);
      expect(saved.associations.slice(2).map((a) => a.term)).toEqual(
        Array.from({ length: 10 }, (_, i) => `term-${i}`),
      );
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/10 tarjetas importadas \(140 fuera por tu límite\)/),
        'success',
      );
    });
  });

  describe('handleBulkAdd (chunked async validation)', () => {
    it('awaits the chunked validation, reports progress and opens the validation screen', async () => {
      useGameStore.setState({ quota: buildQuota('premium') });
      const setIsValidating = vi.fn();
      const setValidationProgress = vi.fn();
      const setValidationResult = vi.fn();
      const setShowValidationScreen = vi.fn();
      const { result } = renderImportActions({
        setIsValidating,
        setValidationProgress,
        setValidationResult,
        setShowValidationScreen,
      });

      await act(async () => {
        await result.current.handleBulkAdd('alpha,beta\ngamma,delta');
      });

      expect(setIsValidating).toHaveBeenNthCalledWith(1, true);
      expect(setIsValidating).toHaveBeenNthCalledWith(2, false);
      expect(setValidationProgress).toHaveBeenLastCalledWith(0);
      expect(setShowValidationScreen).toHaveBeenCalledWith(true);
      expect(setValidationResult).toHaveBeenCalledTimes(1);
      const validation = setValidationResult.mock.calls[0][0] as ImportValidationResult;
      expect(validation.total).toBe(2);
      expect(validation.counts.new).toBe(2);
    });

    it('computes importLimit as remainingCards minus editor rows in create mode', async () => {
      useGameStore.setState({ quota: buildQuota('premium') });
      const setImportLimit = vi.fn();
      const { result } = renderImportActions({ setImportLimit });

      await act(async () => {
        await result.current.handleBulkAdd('alpha,beta\ngamma,delta');
      });

      expect(setImportLimit).toHaveBeenCalledWith(PREMIUM_MAX_CARDS - 2);
    });

    it('computes importLimit as remainingCards in edit mode (deck already counted)', async () => {
      useGameStore.setState({ quota: buildQuota('premium') });
      const setImportLimit = vi.fn();
      const { result } = renderImportActions({
        isCreateMode: false,
        setImportLimit,
      });

      await act(async () => {
        await result.current.handleBulkAdd('alpha,beta\ngamma,delta');
      });

      expect(setImportLimit).toHaveBeenCalledWith(PREMIUM_MAX_CARDS);
    });

    it('does nothing while a validation is already running', async () => {
      const setIsValidating = vi.fn();
      const { result } = renderImportActions({ isValidating: true, setIsValidating });

      await act(async () => {
        await result.current.handleBulkAdd('alpha,beta');
      });

      expect(setIsValidating).not.toHaveBeenCalled();
    });

    it('blocks with a connectivity message when the authenticated user quota is unknown, never the free ceiling', async () => {
      // P1 2026-10-12: quota=null for a signed-in user means getQuota failed.
      // Manufacturing "free" there blocked paying users at 1000 cards.
      useGameStore.setState({ user, quota: null });
      const setShowValidationScreen = vi.fn();
      const { result } = renderImportActions({ setShowValidationScreen });

      await act(async () => {
        await result.current.handleBulkAdd('alpha,beta\ngamma,delta');
      });

      expect(setShowValidationScreen).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.stringMatching(/conexión/i),
        'error',
      );
      expect(mockShowToast).not.toHaveBeenCalledWith(
        expect.stringMatching(/límite de \d+ tarjetas/i),
        expect.anything(),
      );
    });
  });
});
