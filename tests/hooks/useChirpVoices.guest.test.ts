import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useChirpVoices } from '../../src/hooks/voice/tts/useChirpVoices';
import { listTtsVoices } from '../../src/services/voice/tts/chirpVoicesApi';
import { useGameStore } from '../../src/store/gameStore';
import { GUEST_UID } from '../../src/constants/app';
import type { AppUser } from '../../src/types';

vi.mock('../../src/services/voice/tts/chirpVoicesApi', () => ({
  listTtsVoices: vi.fn(),
}));

const listTtsVoicesMock = vi.mocked(listTtsVoices);

const guestUser: AppUser = {
  uid: GUEST_UID,
  displayName: 'Local Guest',
  email: null,
  photoURL: null,
};

const authedUser: AppUser = {
  uid: 'user-123',
  displayName: 'Authed',
  email: 'user@example.com',
  photoURL: null,
};

describe('useChirpVoices - guest guard (section 31)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('never calls listTtsVoices for guests', async () => {
    useGameStore.setState({ user: guestUser });

    const { result } = renderHook(() => useChirpVoices());

    expect(listTtsVoicesMock).not.toHaveBeenCalled();
    expect(result.current.voices).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('never calls listTtsVoices when no user is set', async () => {
    useGameStore.setState({ user: null });

    renderHook(() => useChirpVoices());

    expect(listTtsVoicesMock).not.toHaveBeenCalled();
  });

  it('loads the catalog for authenticated users', async () => {
    useGameStore.setState({ user: authedUser });
    listTtsVoicesMock.mockResolvedValue([
      { id: 'v1', languageCode: 'es-ES', label: 'Chirp HD', lang: 'es' },
      { id: 'v2', languageCode: 'en-US', label: 'Chirp HD 2', lang: 'en' },
    ]);

    const { result } = renderHook(() => useChirpVoices('es'));

    expect(listTtsVoicesMock).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.voices).toHaveLength(1));
    expect(result.current.voices[0].id).toBe('v1');
  });
});
