import { PrebuiltDeck } from '../types';
import type { AssociationList } from '../types';
import { calculateSimilarity, normalize } from './similarity';

export type CardCategory = 'existing' | 'similar' | 'new';

export interface SimilarMatch {
  existingTerm: string;
  similarity: number;
}

export interface CategorizedCard {
  card: { term: string; definition: string; context: string };
  category: CardCategory;
  similarMatch?: SimilarMatch;
}

export interface DeckValidationResult {
  total: number;
  counts: Record<CardCategory, number>;
  categorized: CategorizedCard[];
}

/** Pure analysis: categorize each card of a deck against existing lists. */
export function categorizeDeckCards(
  deck: PrebuiltDeck,
  existingLists: AssociationList[] | undefined | null
): DeckValidationResult {
  // 1. Build a Set of all normalized existing terms
  const existingTerms = new Set<string>();
  for (const list of (existingLists ?? [])) {
    for (const assoc of list.associations) {
      const normalized = normalize(assoc.term);
      if (normalized.length > 0) {
        existingTerms.add(normalized);
      }
    }
  }

  const categorized: CategorizedCard[] = [];
  let existingCount = 0;
  let similarCount = 0;
  let newCount = 0;

  for (const card of deck.associations) {
    const deckTermNorm = normalize(card.term);

    // Exact match?
    if (existingTerms.has(deckTermNorm)) {
      categorized.push({
        card: { term: card.term, definition: card.definition.join(' | '), context: card.context },
        category: 'existing',
      });
      existingCount++;
      continue;
    }

    // Compute similarity against all existing terms
    let bestSimilarity = 0;
    let bestExistingTerm = '';

    for (const existingNorm of existingTerms) {
      const sim = calculateSimilarity(card.term, existingNorm);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestExistingTerm = existingNorm;
      }
    }

    if (bestSimilarity >= 0.80) {
      categorized.push({
        card: { term: card.term, definition: card.definition.join(' | '), context: card.context },
        category: 'similar',
        similarMatch: {
          existingTerm: bestExistingTerm,
          similarity: bestSimilarity,
        },
      });
      similarCount++;
    } else {
      categorized.push({
        card: { term: card.term, definition: card.definition.join(' | '), context: card.context },
        category: 'new',
      });
      newCount++;
    }
  }

  return {
    total: deck.associations.length,
    counts: { existing: existingCount, similar: similarCount, new: newCount },
    categorized,
  };
}