import { useMemo } from 'react';
import type { PrebuiltDeck } from '../../types/prebuilt-deck';
import type { AssociationList } from '../../types';
import type { DeckValidationResult } from '../../types/deck-validation';
import { categorizeDeckCards } from '../../utils/deckValidation';

export function useDeckValidation(
  deck: PrebuiltDeck | null,
  existingLists: AssociationList[] | undefined | null,
): { result: DeckValidationResult | null; isValidating: boolean } {
  // Memoization key: deck id + checksum of existing lists
  const listChecksum = useMemo(() => {
    if (!existingLists) return 0;
    return existingLists.reduce((acc, list) => acc + list.associations.length, 0);
  }, [existingLists]);

  const result = useMemo(() => {
    if (!deck) return null;

    // When there are no existing lists, all cards are "new"
    if (!existingLists || existingLists.length === 0) {
      return categorizeDeckCards(deck, []);
    }

    return categorizeDeckCards(deck, existingLists);
  }, [deck, listChecksum]);

  // Since the computation is synchronous (useMemo), isValidating is always false
  // In a real async scenario, this would track async computation state
  const isValidating = false;

  return { result, isValidating };
}