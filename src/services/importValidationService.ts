import { Association, AssociationList } from '../types';
import { calculateSimilarity } from '../utils/similarity';

/** Normaliza un término: minúsculas, tildes eliminadas, sin caracteres especiales. */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[-–—]/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '');
}

export type CardCategory = 'existing' | 'similar' | 'new';

export interface SimilarMatch {
  existingTerm: string;
  similarity: number;
}

export interface CategorizedCard {
  card: { term: string; definition: string };
  category: CardCategory;
  similarMatch?: SimilarMatch;
}

export interface ImportValidationResult {
  total: number;
  counts: Record<CardCategory, number>;
  categorized: CategorizedCard[];
  existingTerms: Set<string>;
}

/** Pure validation logic: categorize each imported card. */
export function validateImportCards(
  cards: Association[],
  existingLists: AssociationList[],
): ImportValidationResult {
  // 1. Build a Set of all normalized existing terms
  const existingTerms = new Set<string>();
  for (const list of existingLists) {
    for (const assoc of list.associations) {
      existingTerms.add(normalize(assoc.term));
    }
  }

  const categorized: CategorizedCard[] = [];
  let existingCount = 0;
  let similarCount = 0;
  let newCount = 0;

  for (const card of cards) {
    const deckTermNorm = normalize(card.term);

    // Exact match?
    if (existingTerms.has(deckTermNorm)) {
      categorized.push({
        card: { term: card.term, definition: card.definition.join(' | ') || '' },
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
        card: { term: card.term, definition: card.definition.join(' | ') || '' },
        category: 'similar',
        similarMatch: {
          existingTerm: bestExistingTerm,
          similarity: bestSimilarity,
        },
      });
      similarCount++;
    } else {
      categorized.push({
        card: { term: card.term, definition: card.definition.join(' | ') || '' },
        category: 'new',
      });
      newCount++;
    }
  }

  return {
    total: cards.length,
    counts: { existing: existingCount, similar: similarCount, new: newCount },
    categorized,
    existingTerms,
  };
}