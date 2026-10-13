import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listService } from '@/services/firestoreService';
import { callFunction } from '@/services/callFunction';

vi.mock('@/services/callFunction', () => ({
  callFunction: vi.fn(),
}));

describe('listService.fetchListsByUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Returning [] on failure made loadInitialData treat a network error as an
  // empty account: it persisted [] and seal the list TTL with markCloudFetch.
  it('propagates getLists failures instead of returning an empty array', async () => {
    vi.mocked(callFunction).mockRejectedValue(new Error('HTTP 500'));

    await expect(listService.fetchListsByUser('uid-1')).rejects.toThrow('HTTP 500');
  });

  it('returns the decks on success', async () => {
    vi.mocked(callFunction).mockResolvedValue([{ id: 'deck-1' }]);

    await expect(listService.fetchListsByUser('uid-1')).resolves.toEqual([{ id: 'deck-1' }]);
  });

  it('short-circuits without a userId', async () => {
    await expect(listService.fetchListsByUser('')).resolves.toEqual([]);
    expect(callFunction).not.toHaveBeenCalled();
  });
});
