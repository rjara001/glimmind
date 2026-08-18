import { describe, it, expect } from 'vitest';
import { Association } from '@/types';
import { CardActivityEvent } from '@/types/activity';
import { rankByPlays, rankByWeakness, summarizeSessions, CardContext } from '@/utils/ranking';

const createAssociation = (id: string, overrides: Partial<Association> = {}): Association => ({
  id,
  term: `Term ${id}`,
  definition: `Definition ${id}`,
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  ...overrides,
});

const createContext = (association: Association, overrides: Partial<CardContext> = {}): CardContext => ({
  association,
  listId: 'l1',
  listName: 'List 1',
  ...overrides,
});

describe('rankByPlays', () => {
  it('sorts by timesPlayed descending', () => {
    const cards = [
      createContext(createAssociation('a', { timesPlayed: 3 })),
      createContext(createAssociation('b', { timesPlayed: 9 })),
      createContext(createAssociation('c', { timesPlayed: 5 })),
    ];
    const ranked = rankByPlays(cards);
    expect(ranked.map((c) => c.association.id)).toEqual(['b', 'c', 'a']);
  });

  it('excludes cards that were never played', () => {
    const cards = [
      createContext(createAssociation('a', { timesPlayed: 2 })),
      createContext(createAssociation('b', { timesPlayed: 0 })),
    ];
    const ranked = rankByPlays(cards);
    expect(ranked.map((c) => c.association.id)).toEqual(['a']);
  });

  it('computes accuracy from hits and misses', () => {
    const cards = [createContext(createAssociation('a', { timesPlayed: 4, hits: 3, misses: 1 }))];
    const [ranked] = rankByPlays(cards);
    expect(ranked.accuracy).toBe(75);
  });
});

describe('rankByWeakness', () => {
  it('sorts by fewest hits first', () => {
    const cards = [
      createContext(createAssociation('a', { timesPlayed: 5, hits: 3, misses: 2 })),
      createContext(createAssociation('b', { timesPlayed: 5, hits: 1, misses: 4 })),
      createContext(createAssociation('c', { timesPlayed: 5, hits: 5, misses: 0 })),
    ];
    const ranked = rankByWeakness(cards);
    expect(ranked.map((c) => c.association.id)).toEqual(['b', 'a', 'c']);
  });

  it('breaks ties by accuracy ascending', () => {
    const cards = [
      createContext(createAssociation('a', { timesPlayed: 6, hits: 2, misses: 4 })),
      createContext(createAssociation('b', { timesPlayed: 10, hits: 2, misses: 0 })),
    ];
    const ranked = rankByWeakness(cards);
    expect(ranked.map((c) => c.association.id)).toEqual(['a', 'b']);
  });

  it('excludes cards that were never played', () => {
    const cards = [
      createContext(createAssociation('a', { timesPlayed: 0 })),
      createContext(createAssociation('b', { timesPlayed: 1, hits: 0, misses: 1 })),
    ];
    const ranked = rankByWeakness(cards);
    expect(ranked.map((c) => c.association.id)).toEqual(['b']);
  });
});

describe('summarizeSessions', () => {
  const event = (overrides: Partial<CardActivityEvent>): CardActivityEvent => ({
    id: 'e1',
    userId: 'u1',
    listId: 'l1',
    cardId: 'c1',
    cardTerm: 'Term',
    type: 'card_answered',
    at: 100,
    ...overrides,
  });

  it('groups events by sessionId and counts results', () => {
    const events: CardActivityEvent[] = [
      event({ sessionId: 's1', cardId: 'c1', correct: true, at: 100 }),
      event({ sessionId: 's1', cardId: 'c1', correct: true, at: 200 }),
      event({ sessionId: 's1', cardId: 'c2', correct: false, at: 300 }),
      event({ sessionId: 's1', cardId: 'c2', type: 'card_level_up', toLevel: 'vistas', at: 400 }),
      event({ sessionId: 's2', cardId: 'c3', correct: true, at: 500 }),
    ];
    const summaries = summarizeSessions(events);

    expect(summaries).toHaveLength(2);
    const s1 = summaries.find((s) => s.id === 's1');
    expect(s1).toBeDefined();
    expect(s1?.cardsPlayed).toBe(2);
    expect(s1?.correct).toBe(2);
    expect(s1?.incorrect).toBe(1);
    expect(s1?.byLevel.vistas).toBe(1);
    expect(s1?.startedAt).toBe(100);
    expect(s1?.endedAt).toBe(400);
  });

  it('sorts summaries by endedAt descending', () => {
    const events: CardActivityEvent[] = [
      event({ sessionId: 'old', at: 100, correct: true }),
      event({ sessionId: 'new', at: 500, correct: true }),
    ];
    const summaries = summarizeSessions(events);
    expect(summaries.map((s) => s.id)).toEqual(['new', 'old']);
  });

  it('ignores events without a sessionId', () => {
    const events: CardActivityEvent[] = [event({ at: 100, correct: true })];
    expect(summarizeSessions(events)).toEqual([]);
  });
});
