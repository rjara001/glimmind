import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useGameStore } from '@/store/gameStore';
import { listService } from '@/services/firestoreService';
import { AppUser, AssociationList } from '@/types';
import { AssociationDelta } from '@/utils/syncDelta';

const REAL_USER: AppUser = {
  uid: 'real-user-1',
  displayName: 'Real',
  email: 'a@b.c',
  photoURL: null,
};

// The cloud can hand back an ISO string here; the server schema only accepts
// an integer, which is exactly the payload that used to answer 400.
const CLOUD_UPDATED_AT_STRING = '2026-10-13T10:00:00.000Z';

function makeList(): AssociationList {
  return {
    id: 'deck-1',
    userId: REAL_USER.uid,
    name: 'Deck 1',
    concept: 'term / definition',
    associations: [],
    settings: {
      mode: 'training',
      flipOrder: 'normal',
      threshold: 0.95,
      ignoreArticles: true,
      showHints: true,
    },
    createdAt: Date.parse(CLOUD_UPDATED_AT_STRING),
    updatedAt: CLOUD_UPDATED_AT_STRING,
  } as unknown as AssociationList;
}

function makeDelta(overrides: Partial<AssociationDelta> = {}): AssociationDelta {
  return {
    id: 'card-1',
    fields: { currentCycle: 1, hits: 1 },
    updatedAt: 1_728_000_000_000,
    ...overrides,
  };
}

describe('flushSync payload sanitisation', () => {
  let updateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    updateSpy = vi.spyOn(listService, 'updateListFields').mockResolvedValue(undefined);

    useGameStore.setState({
      user: REAL_USER,
      lists: [makeList()],
      currentListId: null,
      currentList: null,
      pendingDeltas: new Map(),
      syncInProgress: new Set(),
      lastSyncedAt: new Map(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('repairs a malformed payload before sending it', async () => {
    useGameStore.setState({
      pendingDeltas: new Map([
        [
          'deck-1',
          [
            makeDelta({ fields: { currentCycle: 0, hits: 2.5 }, updatedAt: 1728000000123.6 }),
            makeDelta({ id: '   ', fields: { currentCycle: 1 } }),
          ],
        ],
      ]),
    });

    await useGameStore.getState().flushSync('deck-1');

    expect(updateSpy).toHaveBeenCalledTimes(1);
    const [, baseUpdatedAt, deltas] = updateSpy.mock.calls[0];

    expect(baseUpdatedAt).toBe(Date.parse(CLOUD_UPDATED_AT_STRING));
    expect(Number.isInteger(baseUpdatedAt)).toBe(true);
    expect(deltas).toHaveLength(1);
    expect(deltas[0].id).toBe('card-1');
    expect(deltas[0].fields.currentCycle).toBe(1);
    expect(deltas[0].fields.hits).toBe(3);
    expect(Number.isInteger(deltas[0].updatedAt)).toBe(true);
  });

  it('clears the pending deltas after a successful send', async () => {
    useGameStore.setState({
      pendingDeltas: new Map([['deck-1', [makeDelta()]]]),
    });

    await useGameStore.getState().flushSync('deck-1');

    expect(useGameStore.getState().pendingDeltas.has('deck-1')).toBe(false);
  });

  it('drops deltas that can never be sent instead of retrying them forever', async () => {
    useGameStore.setState({
      pendingDeltas: new Map([['deck-1', [makeDelta({ id: '' }), makeDelta({ id: ' ' })]]]),
    });

    await useGameStore.getState().flushSync('deck-1');

    expect(updateSpy).not.toHaveBeenCalled();
    expect(useGameStore.getState().pendingDeltas.has('deck-1')).toBe(false);
  });

  it('keeps the pending deltas when the server rejects the payload', async () => {
    updateSpy.mockRejectedValue(new Error('Invalid request body'));
    useGameStore.setState({
      pendingDeltas: new Map([['deck-1', [makeDelta()]]]),
    });

    await useGameStore.getState().flushSync('deck-1');

    expect(useGameStore.getState().pendingDeltas.get('deck-1')).toHaveLength(1);
  });

  it('never sends more than the 500-delta server cap in one request', async () => {
    const deltas: AssociationDelta[] = Array.from({ length: 501 }, (_, index) =>
      makeDelta({ id: `card-${index}`, updatedAt: 1_728_000_000_000 + index })
    );
    useGameStore.setState({
      pendingDeltas: new Map([['deck-1', deltas]]),
    });

    await useGameStore.getState().flushSync('deck-1');

    expect(updateSpy).toHaveBeenCalledTimes(2);
    const firstBatch = updateSpy.mock.calls[0][2];
    const secondBatch = updateSpy.mock.calls[1][2];
    expect(firstBatch).toHaveLength(500);
    expect(secondBatch).toHaveLength(1);
  });
});
