import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ListServiceImpl } from '@/services/listService';
import { ListNotFoundError, QuotaExceededError } from '@/errors/listErrors';
import type { Association, AssociationList } from '@/types';

vi.mock('@/services/errorReporting', () => ({
  logEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/quotaService', () => ({
  QuotaService: {
    getMaxCards: vi.fn(() => 1000),
    getStatus: vi.fn(() => ({
      currentCards: 0,
      maxCards: 1000,
      usageRatio: 0,
      percentage: 0,
      level: 'ok',
      isAiBlocked: false,
      isManualBlocked: false,
      remainingCards: 1000,
    })),
  },
  quotaService: {
    fetchQuota: vi.fn().mockResolvedValue({ tier: 'premium' }),
  },
}));

function makeAssociation(id: string, term: string): Association {
  return { id, term, definition: ['def'], currentCycle: 1, status: 'pending', isLearned: false, isArchived: false };
}

function makeExisting(associations: Association[]): AssociationList {
  return {
    id: 'deck-1',
    userId: 'user-1',
    name: 'Deck',
    concept: 'c',
    associations,
    isArchived: false,
    settings: {} as AssociationList['settings'],
    createdAt: 0,
    updatedAt: 0,
  };
}

describe('ListServiceImpl activity is best-effort, never a veto', () => {
  let firestoreMock: {
    getList: ReturnType<typeof vi.fn>;
    updateList: ReturnType<typeof vi.fn>;
    createList: ReturnType<typeof vi.fn>;
    splitList: ReturnType<typeof vi.fn>;
  };
  let activityMock: { recordEvents: ReturnType<typeof vi.fn>; recordCardsCreated: ReturnType<typeof vi.fn> };
  let service: ListServiceImpl;
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    firestoreMock = {
      getList: vi.fn(),
      updateList: vi.fn().mockResolvedValue(undefined),
      createList: vi.fn().mockResolvedValue('new-deck'),
      splitList: vi.fn().mockResolvedValue(['deck-1', 'deck-2']),
    };
    activityMock = {
      recordEvents: vi.fn().mockResolvedValue(undefined),
      recordCardsCreated: vi.fn().mockResolvedValue(undefined),
    };
    service = new ListServiceImpl(firestoreMock as never, activityMock as never);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('updateList persists the edit even when recordEvents rejects', async () => {
    activityMock.recordEvents.mockRejectedValue(new Error('Failed to fetch'));
    const existing = makeExisting([makeAssociation('a1', 'hola')]);
    firestoreMock.getList.mockResolvedValue(existing);

    await expect(
      service.updateList({ id: 'deck-1', associations: [makeAssociation('a1', 'hola'), makeAssociation('a2', 'adios')] })
    ).resolves.toBeUndefined();

    expect(firestoreMock.updateList).toHaveBeenCalledTimes(1);
  });

  it('updateList records activity after the write, not before', async () => {
    const order: string[] = [];
    firestoreMock.updateList.mockImplementation(async () => { order.push('write'); });
    activityMock.recordEvents.mockImplementation(async () => { order.push('activity'); });
    const existing = makeExisting([makeAssociation('a1', 'hola')]);
    firestoreMock.getList.mockResolvedValue(existing);

    await service.updateList({ id: 'deck-1', associations: [makeAssociation('a1', 'hola'), makeAssociation('a2', 'adios')] });

    expect(order).toEqual(['write', 'activity']);
  });

  it('updateList still propagates a failed primary write', async () => {
    firestoreMock.updateList.mockRejectedValue(new Error('HTTP 500'));
    const existing = makeExisting([makeAssociation('a1', 'hola')]);
    firestoreMock.getList.mockResolvedValue(existing);

    await expect(
      service.updateList({ id: 'deck-1', associations: [makeAssociation('a1', 'hola'), makeAssociation('a2', 'adios')] })
    ).rejects.toThrow('HTTP 500');
  });

  it('updateList still throws ListNotFoundError for a missing deck', async () => {
    firestoreMock.getList.mockResolvedValue(null);

    await expect(service.updateList({ id: 'gone', name: 'x' })).rejects.toBeInstanceOf(ListNotFoundError);
  });

  it('updateList still enforces the card ceiling before writing', async () => {
    const { QuotaService } = await import('@/services/quotaService');
    vi.mocked(QuotaService.getStatus).mockReturnValueOnce({
      currentCards: 0,
      maxCards: 0,
      usageRatio: 0,
      percentage: 0,
      level: 'blocked',
      isAiBlocked: false,
      isManualBlocked: false,
      remainingCards: 0,
    });
    const existing = makeExisting([]);
    firestoreMock.getList.mockResolvedValue(existing);

    await expect(
      service.updateList({ id: 'deck-1', associations: [makeAssociation('a1', 'hola')] })
    ).rejects.toBeInstanceOf(QuotaExceededError);
    expect(firestoreMock.updateList).not.toHaveBeenCalled();
  });

  it('splitList returns the new ids even when recordEvents rejects', async () => {
    activityMock.recordEvents.mockRejectedValue(new Error('Failed to fetch'));
    firestoreMock.getList.mockResolvedValue(makeExisting([makeAssociation('a1', 'hola')]));

    const groups = [
      { name: 'g1', associations: [makeAssociation('a1', 'hola')] },
      { name: 'g2', associations: [makeAssociation('a2', 'adios')] },
    ];
    await expect(service.splitList('deck-1', groups)).resolves.toEqual(['deck-1', 'deck-2']);
  });

  it('createList returns the id even when recordCardsCreated rejects', async () => {
    activityMock.recordCardsCreated.mockRejectedValue(new Error('Failed to fetch'));

    await expect(
      service.createList({
        name: 'n',
        concept: 'c',
        associations: [makeAssociation('a1', 'hola')],
        userId: 'user-1',
        settings: {} as AssociationList['settings'],
      })
    ).resolves.toBe('new-deck');
  });

  it('reports a failed activity record through logEvent', async () => {
    const { logEvent } = await import('@/services/errorReporting');
    activityMock.recordEvents.mockRejectedValue(new Error('Failed to fetch'));
    firestoreMock.getList.mockResolvedValue(makeExisting([makeAssociation('a1', 'hola')]));

    await service.updateList({ id: 'deck-1', associations: [makeAssociation('a1', 'hola'), makeAssociation('a2', 'adios')] });

    expect(logEvent).toHaveBeenCalledWith(
      'activity.record_error',
      expect.objectContaining({
        labels: expect.objectContaining({ source: 'listService', action: 'updateList' }),
      })
    );
  });
});
