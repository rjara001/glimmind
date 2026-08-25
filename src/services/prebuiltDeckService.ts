import { PrebuiltDeck } from '../types/prebuilt-deck';
import { callFunction } from './callFunction';

export const prebuiltDeckService = {
  fetchDecks: async (): Promise<PrebuiltDeck[]> => {
    try {
      return await callFunction<PrebuiltDeck[]>('getPrebuiltDecks', {});
    } catch (error) {
      console.error('[prebuiltDeckService] fetchDecks failed:', error);
      return [];
    }
  },
};
