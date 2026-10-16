import { PrebuiltDeck } from '../types/prebuilt-deck';
import { callFunction } from './callFunction';
import { isUsingEmulators } from '../firebase';
import { useGameStore } from '../store/gameStore';
import { GUEST_UID } from '../constants/app';

export const prebuiltDeckService = {
  fetchDecks: async (): Promise<PrebuiltDeck[]> => {
    // AGENTS.md §31: guests never invoke Cloud Functions. An empty catalog is
    // a valid local answer — the custom-creation path stays available.
    const { user } = useGameStore.getState();
    if (!user || user.uid === GUEST_UID) {
      console.log('[prebuiltDeckService] guest session: returning empty catalog');
      return [];
    }
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
