import { PrebuiltDeck } from '../types/prebuilt-deck';
import type { AssociationList } from '../types';
import {
  findBestSimilarity,
  normalize,
  SCAN_CARD_YIELD_EVERY,
  yieldToEventLoop,
} from './similarity';
import type { ChunkedScanOptions, ScanProgress } from './similarity';

export type CardCategory = 'existing' | 'similar' | 'new';

/** Similarity at or above this value categorizes a card as 'similar'. */
export const SIMILARITY_MATCH_THRESHOLD = 0.8;

export interface SimilarMatch {
  existingTerm: string;
  similarity: number;
}

export interface CategorizedCard {
  card: { term: string; definition: string };
  category: CardCategory;
  similarMatch?: SimilarMatch;
}

export interface DeckValidationResult {
  total: number;
  counts: Record<CardCategory, number>;
  categorized: CategorizedCard[];
}

export type DeckValidationProgress = ScanProgress;

export type CategorizeDeckOptions = ChunkedScanOptions;

/**
 * Pure analysis: categorize each card of a deck against existing lists.
 *
 * Async and chunked: the O(N x M) similarity scan yields to the event loop
 * so the UI can render a loading state instead of freezing. Classification
 * is identical to the previous synchronous implementation.
 */
export async function categorizeDeckCards(
  deck: PrebuiltDeck,
  existingLists: AssociationList[] | undefined | null,
  options: CategorizeDeckOptions = {},
): Promise<DeckValidationResult> {
  const { chunkSize, onProgress } = options;

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

  // Pre-compute the compare-side strings exactly as the old per-pair
  // calculateSimilarity(card.term, existingNorm) did, once per existing term
  // instead of once per pair.
  const existingCompare = Array.from(existingTerms, (term) => normalize(term));

  const categorized: CategorizedCard[] = [];
  let existingCount = 0;
  let similarCount = 0;
  let newCount = 0;

  const total = deck.associations.length;
  let lastReportedPercent = -1;
  const report = (processed: number) => {
    const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
    // Always emit the final processed === total report, even if the integer
    // percent was already reached by an earlier (rounded) update.
    if (percent !== lastReportedPercent || processed >= total) {
      lastReportedPercent = percent;
      onProgress?.({ processed, total });
    }
  };

  for (let index = 0; index < deck.associations.length; index++) {
    const card = deck.associations[index];
    const deckTermNorm = normalize(card.term);

    // Exact match?
    if (existingTerms.has(deckTermNorm)) {
      categorized.push({
        card: { term: card.term, definition: card.definition },
        category: 'existing',
      });
      existingCount++;
      continue;
    }

    // Compute similarity against all existing terms. The old code passed the
    // raw term to calculateSimilarity (utils normalize); reproducing that
    // exactly here while normalizing the card only once per card.
    const deckTermCompare = normalize(card.term);
    const best = await findBestSimilarity(deckTermCompare, existingCompare, {
      threshold: SIMILARITY_MATCH_THRESHOLD,
      chunkSize,
      onYield: () => report(index),
    });

    if (best.similarity >= SIMILARITY_MATCH_THRESHOLD) {
      categorized.push({
        card: { term: card.term, definition: card.definition },
        category: 'similar',
        similarMatch: {
          existingTerm: best.term,
          similarity: best.similarity,
        },
      });
      similarCount++;
    } else {
      categorized.push({
        card: { term: card.term, definition: card.definition },
        category: 'new',
      });
      newCount++;
    }

    if ((index + 1) % SCAN_CARD_YIELD_EVERY === 0) {
      report(index + 1);
      await yieldToEventLoop();
    }
  }

  report(total);

  return {
    total: deck.associations.length,
    counts: { existing: existingCount, similar: similarCount, new: newCount },
    categorized,
  };
}
