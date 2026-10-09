import { describe, it, expect, vi, beforeEach } from 'vitest';
import { youtubeDeckService } from '@/services/youtubeDeckService';
import { useGameStore } from '@/store/gameStore';
import { GUEST_UID } from '@/constants/app';
import { GuestFeatureRequiredError, GUEST_AI_SIGNUP_MESSAGE } from '@/errors/guestErrors';
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

const ytConfig = {
  maxTerms: 40,
  targetLanguage: 'es',
  level: 'b2c1' as const,
};

const textConfig = {
  maxTerms: 40,
  targetLanguage: 'es',
  level: 'b2c1' as const,
};

describe('youtubeDeckService — guest guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createVocabularyDeck', () => {
    it('throws GuestFeatureRequiredError for guests without calling the API', async () => {
      useGameStore.setState({ user: guestUser });
      const callSpy = vi.spyOn(callFunctionModule, 'callFunction');

      await expect(
        youtubeDeckService.createVocabularyDeck('https://youtube.com/watch?v=abc', ytConfig)
      ).rejects.toThrow(GuestFeatureRequiredError);

      expect(callSpy).not.toHaveBeenCalled();
    });

    it('throws GuestFeatureRequiredError when there is no user', async () => {
      useGameStore.setState({ user: null });
      const callSpy = vi.spyOn(callFunctionModule, 'callFunction');

      await expect(
        youtubeDeckService.createVocabularyDeck('https://youtube.com/watch?v=abc', ytConfig)
      ).rejects.toThrow(GuestFeatureRequiredError);

      expect(callSpy).not.toHaveBeenCalled();
    });

    it('surfaces the signup message, never the string "Unauthorized"', async () => {
      useGameStore.setState({ user: guestUser });

      await expect(
        youtubeDeckService.createVocabularyDeck('https://youtube.com/watch?v=abc', ytConfig)
      ).rejects.toThrow(/crea tu usuario/i);
    });

    it('calls the API for real users', async () => {
      useGameStore.setState({ user: realUser });
      const callSpy = vi.spyOn(callFunctionModule, 'callFunction').mockResolvedValue({
        title: 'Deck',
        items: [],
      } as never);

      await youtubeDeckService.createVocabularyDeck('https://youtube.com/watch?v=abc', ytConfig);

      expect(callSpy).toHaveBeenCalledWith('createYouTubeDeck', expect.objectContaining({
        url: 'https://youtube.com/watch?v=abc',
      }));
    });
  });

  describe('createDeckFromText', () => {
    it('throws GuestFeatureRequiredError for guests without calling the API', async () => {
      useGameStore.setState({ user: guestUser });
      const callSpy = vi.spyOn(callFunctionModule, 'callFunction');

      await expect(
        youtubeDeckService.createDeckFromText('some transcript text', textConfig)
      ).rejects.toThrow(GuestFeatureRequiredError);

      expect(callSpy).not.toHaveBeenCalled();
    });

    it('surfaces the signup message, never the string "Unauthorized"', async () => {
      useGameStore.setState({ user: guestUser });

      await expect(
        youtubeDeckService.createDeckFromText('some transcript text', textConfig)
      ).rejects.toThrow(/crea tu usuario/i);
    });

    it('calls the API for real users', async () => {
      useGameStore.setState({ user: realUser });
      const callSpy = vi.spyOn(callFunctionModule, 'callFunction').mockResolvedValue({
        title: 'Deck',
        items: [],
      } as never);

      await youtubeDeckService.createDeckFromText('some transcript text', textConfig);

      expect(callSpy).toHaveBeenCalledWith('createDeckFromText', expect.objectContaining({
        text: 'some transcript text',
      }));
    });
  });

  describe('GUEST_AI_SIGNUP_MESSAGE', () => {
    it('asks the guest to create an account and is not the raw Unauthorized string', () => {
      expect(GUEST_AI_SIGNUP_MESSAGE).toMatch(/crea tu usuario/i);
      expect(GUEST_AI_SIGNUP_MESSAGE).not.toMatch(/unauthorized/i);
    });
  });
});