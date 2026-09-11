import type { Association } from '../types';
import { MAX_CARDS_PER_DECK } from '../constants/limits';

export interface SplitResult {
  chunks: Association[][];
  deckNames: string[];
}

export function splitAssociationsByMax(
  associations: Association[],
  maxCards: number = MAX_CARDS_PER_DECK,
  baseDeckName: string = 'Deck'
): SplitResult {
  const chunks: Association[][] = [];
  const deckNames: string[] = [];

  let currentIndex = 0;
  let chunkNumber = 0;

  while (currentIndex < associations.length) {
    const chunk = associations.slice(currentIndex, currentIndex + maxCards);
    chunks.push(chunk);
    chunkNumber++;

    if (chunkNumber === 1) {
      deckNames.push(baseDeckName);
    } else {
      deckNames.push(`${baseDeckName}-${chunkNumber}`);
    }

    currentIndex += maxCards;
  }

  return { chunks, deckNames };
}