import { describe, it, expect } from 'vitest';
import { categorizeDeckCards } from '@/utils/deckValidation';
import type { PrebuiltDeck } from '@/types/prebuilt-deck';
import type { AssociationList } from '@/types';

const makeList = (term: string, definition = 'def'): AssociationList => ({
  id: `list-${term}`,
  userId: 'user-1',
  name: 'Test List',
  concept: 'value1 / value2',
  isArchived: false,
  associations: [
    {
      id: `a-${term}`,
      term,
      definition: [definition],
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    },
  ],
  settings: {
    mode: 'training',
    flipOrder: 'normal',
    threshold: 0.95,
    ignoreArticles: true,
    showHints: true,
    autoRevealAfterSeconds: 15,
    autoAdvanceAfterAttempts: 3,
  },
});

const makeDeck = (associations: { term: string; definition: string }[]): PrebuiltDeck => ({
  id: 'test-deck',
  name: 'Test Deck',
  concept: 'value1 / value2',
  category: 'Casual',
  description: 'Test',
  icon: '📚',
  order: 1,
  active: true,
  associations: associations.map(a => ({ term: a.term, definition: [a.definition], context: '' })),
});


describe('categorizeDeckCards', () => {
  it('categorizes exact term match as existing (case-insensitive)', () => {
    const existingLists = [makeList('House', 'Casa')];
    const deck = makeDeck([{ term: 'house', definition: 'Casa' }]);

    const result = categorizeDeckCards(deck, existingLists);

    expect(result.counts.existing).toBe(1);
    expect(result.counts.similar).toBe(0);
    expect(result.counts.new).toBe(0);
    expect(result.categorized[0].category).toBe('existing');
  });

  it('categorizes Levenshtein-similar term as similar with match data', () => {
    const existingLists = [makeList('test', 'prueba')];
    const deck = makeDeck([{ term: 'tests', definition: 'pruebas' }]);

    const result = categorizeDeckCards(deck, existingLists);

    expect(result.counts.similar).toBe(1);
    expect(result.categorized[0].category).toBe('similar');
    expect(result.categorized[0].similarMatch).toBeDefined();
    expect(result.categorized[0].similarMatch?.existingTerm).toBe('test');
    expect(result.categorized[0].similarMatch?.similarity).toBe(0.8);
  });

  it('categorizes below-threshold similarity as new', () => {
    const existingLists = [makeList('abandon', 'abandonar')];
    const deck = makeDeck([{ term: 'Abandonar', definition: 'Abandon' }]);

    const result = categorizeDeckCards(deck, existingLists);

    // Abandon vs Abandonar = 0.778 < 0.80 → new (not similar)
    expect(result.counts.new).toBe(1);
    expect(result.categorized[0].category).toBe('new');
    expect(result.categorized[0].similarMatch).toBeUndefined();
  });

  it('categorizes completely new term as new', () => {
    const existingLists = [makeList('dog', 'perro')];
    const deck = makeDeck([{ term: 'cat', definition: 'gato' }]);

    const result = categorizeDeckCards(deck, existingLists);

    expect(result.counts.new).toBe(1);
    expect(result.categorized[0].category).toBe('new');
  });

  it('returns all new when existing lists are empty', () => {
    const deck = makeDeck([
      { term: 'alpha', definition: 'A' },
      { term: 'beta', definition: 'B' },
    ]);

    const result = categorizeDeckCards(deck, []);

    expect(result.counts.existing).toBe(0);
    expect(result.counts.similar).toBe(0);
    expect(result.counts.new).toBe(2);
  });

  it('returns all new when existingLists is undefined', () => {
    const deck = makeDeck([{ term: 'alpha', definition: 'A' }]);

    const result = categorizeDeckCards(deck, undefined);

    expect(result.counts.new).toBe(1);
  });

  it('returns all new when existingLists is null', () => {
    const deck = makeDeck([{ term: 'alpha', definition: 'A' }]);

    const result = categorizeDeckCards(deck, null);

    expect(result.counts.new).toBe(1);
  });

  it('handles deck with no associations', () => {
    const existingLists = [makeList('dog', 'perro')];
    const deck = makeDeck([]);

    const result = categorizeDeckCards(deck, existingLists);

    expect(result.total).toBe(0);
    expect(result.counts.existing).toBe(0);
    expect(result.counts.similar).toBe(0);
    expect(result.counts.new).toBe(0);
    expect(result.categorized).toHaveLength(0);
  });

  it('handles mixed deck with correct distribution', () => {
    const existingLists = [
      makeList('house', 'Casa'),  // matches deck "house" exactly
      makeList('test', 'prueba'), // similar to deck "tests"
    ];
    const deck = makeDeck([
      { term: 'house', definition: 'Casa' },
      { term: 'tests', definition: 'pruebas' },
      { term: 'cat', definition: 'gato' },
      { term: 'dog', definition: 'perro' },
    ]);

    const result = categorizeDeckCards(deck, existingLists);

    expect(result.total).toBe(4);
    expect(result.counts.existing).toBe(1);
    expect(result.counts.similar).toBe(1);
    expect(result.counts.new).toBe(2);
    expect(result.counts.existing + result.counts.similar + result.counts.new).toBe(result.total);
  });

  it('picks the best similarity match for similar cards', () => {
    const existingLists = [
      makeList('test', 'prueba'),
      makeList('tests', 'pruebas'),
    ];
    const deck = makeDeck([{ term: 'testing', definition: 'prueba' }]);

    const result = categorizeDeckCards(deck, existingLists);

    // "testing" vs "tests" = normalize: "testing"(7) vs "tests"(5), edit dist = 2, sim = (7-2)/7 = 0.714 < 0.80
    // "testing" vs "test" = normalize: "testing"(7) vs "test"(4), edit dist = 3, sim = (7-3)/7 = 0.571 < 0.80
    // So "testing" should be "new"
    expect(result.counts.new).toBe(1);
    expect(result.categorized[0].category).toBe('new');
  });

  it('normalizes accents and casing for exact match', () => {
    const existingLists = [makeList('café', 'coffee shop')];
    const deck = makeDeck([{ term: 'CAFE', definition: 'coffee shop' }]);

    const result = categorizeDeckCards(deck, existingLists);

    expect(result.counts.existing).toBe(1);
    expect(result.categorized[0].category).toBe('existing');
  });

  it('strips punctuation for normalization', () => {
    const existingLists = [makeList('okay', 'de acuerdo')];
    const deck = makeDeck([{ term: 'okay!', definition: 'de acuerdo' }]);

    const result = categorizeDeckCards(deck, existingLists);

    expect(result.counts.existing).toBe(1);
  });
});
