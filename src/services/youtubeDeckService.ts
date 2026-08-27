import { VocabularyResult, YouTubeDeckConfig, FromTextConfig } from '../types/youtube-deck';
import { callFunction } from './callFunction';

export const youtubeDeckService = {
  async createVocabularyDeck(url: string, config: YouTubeDeckConfig): Promise<VocabularyResult> {
    return callFunction<VocabularyResult>('createYouTubeDeck', { url, ...config });
  },

  async createDeckFromText(text: string, config: FromTextConfig): Promise<VocabularyResult> {
    return callFunction<VocabularyResult>('createDeckFromText', { text, ...config });
  }
};
