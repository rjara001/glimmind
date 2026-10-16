import { Association, AssociationList } from '../types';
import {
  findBestSimilarity,
  normalize as normalizeForCompare,
  SCAN_CARD_YIELD_EVERY,
  yieldToEventLoop,
} from '../utils/similarity';
import type { ChunkedScanOptions, ScanProgress } from '../utils/similarity';

/** Similarity at or above this value categorizes a card as 'similar'. */
export const SIMILARITY_MATCH_THRESHOLD = 0.8;

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

export type ImportValidationProgress = ScanProgress;

export type ValidateImportOptions = ChunkedScanOptions;

/**
 * Pure validation logic: categorize each imported card.
 *
 * Async and chunked: the O(N x M) similarity scan yields to the event loop
 * every SCAN_CARD_YIELD_EVERY cards and every chunkSize candidate pairs, so
 * the UI can show progress instead of freezing. Classification is identical
 * to the previous synchronous implementation.
 */
export async function validateImportCards(
  cards: Association[],
  existingLists: AssociationList[],
  options: ValidateImportOptions = {},
): Promise<ImportValidationResult> {
  const { chunkSize, onProgress } = options;

  // 1. Build a Set of all normalized existing terms
  const existingTerms = new Set<string>();
  for (const list of existingLists) {
    for (const assoc of list.associations) {
      existingTerms.add(normalize(assoc.term));
    }
  }

  // Pre-compute the compare-side strings exactly as the old per-pair
  // calculateSimilarity(card.term, existingNorm) did (utils-normalized Set
  // value), once per existing term instead of once per pair.
  const existingCompare = Array.from(existingTerms, (term) =>
    normalizeForCompare(term),
  );

  const categorized: CategorizedCard[] = [];
  let existingCount = 0;
  let similarCount = 0;
  let newCount = 0;

  const total = cards.length;
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

  for (let index = 0; index < cards.length; index++) {
    const card = cards[index];
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

    // Compute similarity against all existing terms. The old code passed the
    // raw term to calculateSimilarity (utils normalize); reproducing that
    // exactly here while normalizing the card only once per card.
    const deckTermCompare = normalizeForCompare(card.term);
    const best = await findBestSimilarity(deckTermCompare, existingCompare, {
      threshold: SIMILARITY_MATCH_THRESHOLD,
      chunkSize,
      onYield: () => report(index),
    });

    if (best.similarity >= SIMILARITY_MATCH_THRESHOLD) {
      categorized.push({
        card: { term: card.term, definition: card.definition.join(' | ') || '' },
        category: 'similar',
        similarMatch: {
          existingTerm: best.term,
          similarity: best.similarity,
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

    if ((index + 1) % SCAN_CARD_YIELD_EVERY === 0) {
      report(index + 1);
      await yieldToEventLoop();
    }
  }

  report(total);

  return {
    total: cards.length,
    counts: { existing: existingCount, similar: similarCount, new: newCount },
    categorized,
    existingTerms,
  };
}
