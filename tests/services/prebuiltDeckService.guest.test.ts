import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prebuiltDeckService } from '@/services/prebuiltDeckService';
import { useGameStore } from '@/store/gameStore';
import { GUEST_UID } from '@/constants/app';
import * as callFunctionModule from '@/services/callFunction';

const guestUser = {
  uid: GUEST_UID,
  displayName: 'Local Guest',
  email: null,
  photoURL: null,
};

const realUser = {
  uid: 'real-user-1',
  displayName: 'Real User',
  email: 'user@example.com',
  photoURL: null,
};

describe('prebuiltDeckService — guest guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('returns an empty catalog for guests without calling the API', async () => {
    useGameStore.setState({ user: guestUser });
    const callSpy = vi.spyOn(callFunctionModule, 'callFunction');

    await expect(prebuiltDeckService.fetchDecks()).resolves.toEqual([]);

    expect(callSpy).not.toHaveBeenCalled();
  });

  it('returns an empty catalog when there is no user', async () => {
    useGameStore.setState({ user: null });
    const callSpy = vi.spyOn(callFunctionModule, 'callFunction');

    await expect(prebuiltDeckService.fetchDecks()).resolves.toEqual([]);

    expect(callSpy).not.toHaveBeenCalled();
  });

  it('calls getPrebuiltDecks for real users', async () => {
    useGameStore.setState({ user: realUser });
    const callSpy = vi.spyOn(callFunctionModule, 'callFunction').mockResolvedValue([
      { id: 'deck-1', name: 'Greetings' },
    ] as never);

    const decks = await prebuiltDeckService.fetchDecks();

    expect(callSpy).toHaveBeenCalledWith('getPrebuiltDecks', {});
    expect(decks).toHaveLength(1);
  });

  it('propagates a failed fetch for real users (error state must stay reachable)', async () => {
    useGameStore.setState({ user: realUser });
    vi.spyOn(callFunctionModule, 'callFunction').mockRejectedValue(new Error('HTTP 500'));

    await expect(prebuiltDeckService.fetchDecks()).rejects.toThrow('HTTP 500');
  });
});
