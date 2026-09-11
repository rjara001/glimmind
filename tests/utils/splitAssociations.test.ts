import { describe, it, expect } from 'vitest';
import { splitAssociationsByMax } from '@/utils/splitAssociations';
import type { Association } from '@/types';

const makeAssociation = (term: string): Association => ({
  id: `a-${term}`,
  term,
  definition: [`def-${term}`],
  context: '',
  translation: undefined,
  metadata: undefined,
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
});

describe('splitAssociationsByMax', () => {
  it('returns single chunk without suffix when count equals max', () => {
    const associations = [makeAssociation('a'), makeAssociation('b')];
    const result = splitAssociationsByMax(associations, 2, 'Deck');

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]).toHaveLength(2);
    expect(result.deckNames).toEqual(['Deck']);
  });

  it('returns single chunk without suffix when count is below max', () => {
    const associations = [makeAssociation('a')];
    const result = splitAssociationsByMax(associations, 5, 'Deck');

    expect(result.chunks).toHaveLength(1);
    expect(result.chunks[0]).toHaveLength(1);
    expect(result.deckNames).toEqual(['Deck']);
  });

  it('keeps first chunk name unchanged and numbers subsequent chunks', () => {
    const associations = [makeAssociation('a'), makeAssociation('b'), makeAssociation('c')];
    const result = splitAssociationsByMax(associations, 2, 'Deck');

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]).toHaveLength(2);
    expect(result.chunks[1]).toHaveLength(1);
    expect(result.deckNames).toEqual(['Deck', 'Deck-2']);
  });

  it('splits into multiple decks with correct naming', () => {
    const associations = Array.from({ length: 7 }, (_, i) => makeAssociation(`card-${i}`));
    const result = splitAssociationsByMax(associations, 3, 'MyDeck');

    expect(result.chunks).toHaveLength(3);
    expect(result.chunks[0]).toHaveLength(3);
    expect(result.chunks[1]).toHaveLength(3);
    expect(result.chunks[2]).toHaveLength(1);
    expect(result.deckNames).toEqual(['MyDeck', 'MyDeck-2', 'MyDeck-3']);
  });

  it('uses default max and default name when omitted', () => {
    const associations = Array.from({ length: 101 }, (_, i) => makeAssociation(`card-${i}`));
    const result = splitAssociationsByMax(associations);

    expect(result.chunks).toHaveLength(2);
    expect(result.chunks[0]).toHaveLength(100);
    expect(result.chunks[1]).toHaveLength(1);
    expect(result.deckNames).toEqual(['Deck', 'Deck-2']);
  });

  it('returns empty result for empty associations', () => {
    const result = splitAssociationsByMax([], 5, 'Deck');

    expect(result.chunks).toHaveLength(0);
    expect(result.deckNames).toHaveLength(0);
  });
});
