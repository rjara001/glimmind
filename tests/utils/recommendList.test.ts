import { describe, it, expect } from 'vitest';
import { recommendListsFor } from '@/utils/recommendList';
import { AssociationList } from '@/types';

const createList = (
  id: string,
  concept: string,
  names: string[],
  overrides: Partial<AssociationList> = {},
): AssociationList => ({
  id,
  userId: 'user1',
  name: id,
  concept,
  associations: names.map((name, i) => ({
    id: `${id}-${i}`,
    term: name,
    definition: `def ${i}`,
    currentCycle: 1,
    status: 'pending',
    isLearned: false,
    isArchived: false,
  })),
  isArchived: false,
  settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
  ...overrides,
});

describe('recommendListsFor', () => {
  it('ranks a list matching the concept higher than an unrelated one', () => {
    const lists = [
      createList('verbs', 'Ir', ['eat', 'run']),
      createList('colors', 'Colores', ['red', 'blue']),
    ];

    const result = recommendListsFor('go', 'ir', lists);

    expect(result[0].list.id).toBe('verbs');
    expect(result[0].reasons.some(r => r.includes('Ir'))).toBe(true);
  });

  it('ranks a list sharing vocabulary higher when concepts do not match', () => {
    const lists = [
      createList('a', 'General', ['x', 'y']),
      createList('b', 'General', ['go', 'come']),
    ];

    const result = recommendListsFor('go', 'ir', lists);

    expect(result[0].list.id).toBe('b');
  });

  it('prefers the smaller list when relevance ties', () => {
    const lists = [
      createList('big', 'Verbos', ['eat', 'run', 'jump', 'walk', 'sit']),
      createList('small', 'Verbos', ['eat']),
    ];

    const result = recommendListsFor('go', 'ir', lists);

    expect(result[0].list.id).toBe('small');
  });

  it('ignores archived lists', () => {
    const lists = [
      createList('active', 'Verbos', ['eat']),
      createList('archived', 'Verbos', ['go'], { isArchived: true }),
    ];

    const result = recommendListsFor('go', 'ir', lists);

    expect(result.length).toBe(1);
    expect(result[0].list.id).toBe('active');
  });

  it('matches concept regardless of case and accents', () => {
    const lists = [
      createList('verbs', 'Ír', ['x']),
      createList('colors', 'Colores', ['x']),
    ];

    const result = recommendListsFor('IR', 'ir', lists);

    expect(result[0].list.id).toBe('verbs');
  });

  it('returns an empty array when there are no lists', () => {
    expect(recommendListsFor('go', 'ir', [])).toEqual([]);
  });
});
