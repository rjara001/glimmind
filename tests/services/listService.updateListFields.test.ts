import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/services/callFunction', () => ({
  callFunction: vi.fn(),
}));

import { callFunction } from '@/services/callFunction';
import { listService } from '@/services/firestoreService';

describe('listService.updateListFields diagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs the zod fieldErrors next to the list id and rethrows', async () => {
    const fieldErrors = { baseUpdatedAt: ['Expected integer, received string'] };
    const error = Object.assign(new Error('Invalid request body'), { fieldErrors });
    vi.mocked(callFunction).mockRejectedValue(error);

    await expect(listService.updateListFields('deck-1', 1, [])).rejects.toThrow(
      'Invalid request body'
    );

    expect(console.error).toHaveBeenCalledWith(
      '[listService.updateListFields] rejected for list deck-1:',
      fieldErrors
    );
  });

  it('rethrows without logging when the failure carries no fieldErrors', async () => {
    vi.mocked(callFunction).mockRejectedValue(new Error('HTTP 500'));

    await expect(listService.updateListFields('deck-1', 1, [])).rejects.toThrow('HTTP 500');

    expect(console.error).not.toHaveBeenCalled();
  });

  it('forwards the sanitised payload untouched', async () => {
    vi.mocked(callFunction).mockResolvedValue({});
    const deltas = [
      { id: 'card-1', fields: { currentCycle: 1 }, updatedAt: 1_728_000_000_000 },
    ];

    await listService.updateListFields('deck-1', 1_728_000_000_000, deltas);

    expect(callFunction).toHaveBeenCalledWith('updateListFields', {
      listId: 'deck-1',
      baseUpdatedAt: 1_728_000_000_000,
      deltas,
    });
  });
});
