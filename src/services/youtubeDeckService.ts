import { VocabularyResult, YouTubeDeckConfig, FromTextConfig } from '../types/youtube-deck';
import { callFunction } from './callFunction';
import { useGameStore } from '../store/gameStore';
import { GUEST_UID } from '../constants/app';
import { GuestFeatureRequiredError } from '../errors/guestErrors';

function assertNotGuest(): void {
  const { user } = useGameStore.getState();
  if (!user || user.uid === GUEST_UID) {
    throw new GuestFeatureRequiredError();
  }
}

export const youtubeDeckService = {
  async createVocabularyDeck(url: string, config: YouTubeDeckConfig): Promise<VocabularyResult> {
    assertNotGuest();
    return callFunction<VocabularyResult>('createYouTubeDeck', { url, ...config });
  },

  async createDeckFromText(text: string, config: FromTextConfig): Promise<VocabularyResult> {
    assertNotGuest();
    return callFunction<VocabularyResult>('createDeckFromText', { text, ...config });
  }
};