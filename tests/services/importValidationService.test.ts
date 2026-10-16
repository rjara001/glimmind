import { describe, it, expect } from 'vitest';
import { validateImportCards } from '@/services/importValidationService';
import { calculateSimilarity } from '@/utils/similarity';
import type { Association, AssociationList } from '@/types';

// Legacy normalize (kept identical to the original importValidationService).
function legacyNormalize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[-–—]/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '');
}

// Oracle: the ORIGINAL synchronous implementation (full O(N x M) scan, no
// pruning, no yields). The async implementation must classify identically.
function legacyValidateImportCards(cards: Association[], existingLists: AssociationList[]) {
  const existingTerms = new Set<string>();
  for (const list of existingLists) {
    for (const assoc of list.associations) {
      existingTerms.add(legacyNormalize(assoc.term));
    }
  }

  const categorized: {
    card: { term: string; definition: string };
    category: 'existing' | 'similar' | 'new';
    similarMatch?: { existingTerm: string; similarity: number };
  }[] = [];
  let existingCount = 0;
  let similarCount = 0;
  let newCount = 0;

  for (const card of cards) {
    const deckTermNorm = legacyNormalize(card.term);

    if (existingTerms.has(deckTermNorm)) {
      categorized.push({
        card: { term: card.term, definition: card.definition.join(' | ') || '' },
        category: 'existing',
      });
      existingCount++;
      continue;
    }

    let bestSimilarity = 0;
    let bestExistingTerm = '';

    for (const existingNorm of existingTerms) {
      const sim = calculateSimilarity(card.term, existingNorm);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestExistingTerm = existingNorm;
      }
    }

    if (bestSimilarity >= 0.8) {
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
  };
}

const makeAssociation = (index: number, term: string): Association => ({
  id: `card-${index}`,
  term,
  definition: [`def-${index}`],
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
});

const makeList = (id: string, terms: string[]): AssociationList => ({
  id,
  userId: 'user-1',
  name: `list-${id}`,
  concept: 'term / definition',
  isArchived: false,
  associations: terms.map((term, i) => makeAssociation(`${id}-${i}`, term)),
  settings: {
    mode: 'training',
    flipOrder: 'normal',
    threshold: 0.95,
    ignoreArticles: true,
    showHints: true,
    autoRevealAfterSeconds: 15,
    autoAdvanceAfterAttempts: 3,
  },
  createdAt: 1,
  updatedAt: 1,
});

const makeCards = (terms: string[]): Association[] =>
  terms.map((term, i) => makeAssociation(`new-${i}`, term));

const expectParity = async (
  cards: Association[],
  lists: AssociationList[],
  chunkSize?: number,
) => {
  const legacy = legacyValidateImportCards(cards, lists);
  const optimized = await validateImportCards(
    cards,
    lists,
    chunkSize !== undefined ? { chunkSize } : {},
  );

  expect(optimized.total).toBe(legacy.total);
  expect(optimized.counts).toEqual(legacy.counts);
  expect(optimized.categorized).toEqual(legacy.categorized);
  return optimized;
};

describe('validateImportCards', () => {
  it('classifies exact matches, similar matches and new cards like the legacy scan', async () => {
    const lists = [
      makeList('l1', ['House', 'test', 'abandon', 'café', 'okay']),
    ];
    const cards = makeCards([
      'house',
      'tests',
      'Abandonar',
      'CAFE',
      'okay!',
      'completely-different',
    ]);

    const result = await expectParity(cards, lists);

    expect(result.counts.existing).toBe(3);
    expect(result.counts.similar).toBe(1);
    expect(result.counts.new).toBe(2);
    const similarCard = result.categorized.find((c) => c.category === 'similar');
    expect(similarCard?.similarMatch?.existingTerm).toBe('test');
    expect(similarCard?.similarMatch?.similarity).toBe(0.8);
  });

  it('matches the legacy behavior on double-dash terms (compare-pipeline parity)', async () => {
    const lists = [makeList('l1', ['a--b'])];
    const cards = makeCards(['a--b', 'a b', 'a  b']);

    const result = await expectParity(cards, lists);

    // 'a--b' and 'a  b' normalize to the same local key → existing.
    expect(result.categorized[0].category).toBe('existing');
    expect(result.categorized[2].category).toBe('existing');
  });

  it('produces identical classification with small chunks', async () => {
    const lists = [makeList('l1', ['house', 'test', 'dog'])];
    const cards = makeCards(['house', 'tests', 'cat', 'dogs', 'elephant']);

    await expectParity(cards, lists, 2);
  });

  it('keeps the existingTerms set in the result', async () => {
    const lists = [makeList('l1', ['House', 'test'])];
    const cards = makeCards(['house']);

    const result = await validateImportCards(cards, lists);

    expect(result.existingTerms.has('house')).toBe(true);
    expect(result.existingTerms.has('test')).toBe(true);
    expect(result.total).toBe(1);
  });

  it('joins definitions with " | " for the validation screen', async () => {
    const lists = [makeList('l1', [])];
    const cards: Association[] = [
      { ...makeAssociation('c0', 'hello'), definition: ['a', 'b'] },
    ];

    const result = await validateImportCards(cards, lists);

    expect(result.categorized[0].card.definition).toBe('a | b');
  });

  it('reports progress up to 100 percent and finishes with processed === total', async () => {
    const lists = [makeList('l1', ['house', 'test'])];
    const cards = makeCards(['houses', 'tests', 'cat']);

    const reports: { processed: number; total: number }[] = [];
    const result = await validateImportCards(cards, lists, {
      chunkSize: 1,
      onProgress: (progress) => reports.push(progress),
    });

    expect(result.total).toBe(3);
    expect(reports.length).toBeGreaterThan(0);
    expect(reports[reports.length - 1]).toEqual({ processed: 3, total: 3 });
    const percents = reports.map((r) => Math.round((r.processed / r.total) * 100));
    expect(percents[percents.length - 1]).toBe(100);
  });

  it('handles an empty card list', async () => {
    const lists = [makeList('l1', ['house'])];

    const result = await validateImportCards([], lists);

    expect(result.total).toBe(0);
    expect(result.counts).toEqual({ existing: 0, similar: 0, new: 0 });
    expect(result.categorized).toHaveLength(0);
  });

  it('processes a large validation chunked and quickly (perf smoke)', async () => {
    const existingTerms = Array.from({ length: 2000 }, (_, i) => `existing word ${i}`);
    const cardTerms = Array.from({ length: 1000 }, (_, i) => `brand new term ${i}`);
    const lists = [makeList('l1', existingTerms)];
    const cards = makeCards(cardTerms);

    const reports: { processed: number; total: number }[] = [];
    const startedAt = Date.now();
    const result = await validateImportCards(cards, lists, {
      onProgress: (progress) => reports.push(progress),
    });
    const elapsedMs = Date.now() - startedAt;

    expect(result.total).toBe(1000);
    expect(result.counts.new + result.counts.similar + result.counts.existing).toBe(1000);
    // Generous bound: this asserts the scan COMPLETES and stays far below the
    // old synchronous freeze (50s+ wall clock with zero UI feedback). The
    // bound is loose because the full suite runs in parallel workers.
    expect(elapsedMs).toBeLessThan(20000);
    expect(reports.length).toBeGreaterThan(1);
    expect(reports[reports.length - 1]).toEqual({ processed: 1000, total: 1000 });
  }, 30000);
});
