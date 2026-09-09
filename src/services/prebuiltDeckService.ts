import { PrebuiltDeck } from '../types/prebuilt-deck';
import { callFunction } from './callFunction';
import { isUsingEmulators } from '../firebase';

export const prebuiltDeckService = {
  fetchDecks: async (): Promise<PrebuiltDeck[]> => {
    console.log('[prebuiltDeckService] fetchDecks called, isUsingEmulators=', isUsingEmulators);
    try {
      const result = await callFunction<PrebuiltDeck[]>('getPrebuiltDecks', {});
      console.log('[prebuiltDeckService] fetchDecks result:', result.length, 'decks');
      return result;
    } catch (error) {
      console.error('[prebuiltDeckService] fetchDecks failed:', error);
      throw error;
    }
  },
};
