import { useEffect, useMemo, useState } from 'react';
import type { PrebuiltDeck } from '../../types/prebuilt-deck';
import type { AssociationList } from '../../types';
import type { DeckValidationResult } from '../../types/deck-validation';
import { categorizeDeckCards } from '../../utils/deckValidation';

interface DeckValidationState {
  key: string;
  result: DeckValidationResult;
}

export function useDeckValidation(
  deck: PrebuiltDeck | null,
  existingLists: AssociationList[] | undefined | null,
): { result: DeckValidationResult | null; isValidating: boolean } {
  // Memoization key: deck id + deck size + checksum of existing lists
  const listChecksum = useMemo(() => {
    if (!existingLists) return 0;
    return existingLists.reduce((acc, list) => acc + list.associations.length, 0);
  }, [existingLists]);

  const validationKey = deck
    ? `${deck.id}:${deck.associations.length}:${listChecksum}`
    : null;

  const [state, setState] = useState<DeckValidationState | null>(null);

  useEffect(() => {
    if (!deck || !validationKey) {
      setState(null);
      return;
    }

    let cancelled = false;
    // Chunked async categorization: yields keep the UI responsive and the
    // keyed state flip drives isValidating without a stale-result flash.
    categorizeDeckCards(deck, existingLists ?? []).then((result) => {
      if (!cancelled) {
        setState({ key: validationKey, result });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [deck, existingLists, validationKey]);

  const isValidating = deck !== null && state?.key !== validationKey;
  const result =
    state && validationKey && state.key === validationKey ? state.result : null;

  return { result, isValidating };
}
