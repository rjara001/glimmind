import { describe, it, expect } from 'vitest';
import { normalizeAssociations } from '@/utils/normalizeAssociation';
import { Association } from '@/types';

function makeAssociation(overrides: Partial<Association> = {}): Association {
  return {
    id: crypto.randomUUID(),
    term: 'test term',
    definition: ['test definition'],
    currentCycle: 1,
    status: 'pending',
    isLearned: false,
    isArchived: false,
    hits: 0,
    misses: 0,
    timesPlayed: 0,
    ...overrides,
  };
}

describe('normalizeAssociations - progress preservation on duplicate merge', () => {
  it('preserves max hits/misses/timesPlayed when merging duplicates', () => {
    const associations: Association[] = [
      makeAssociation({ id: '1', term: 'Hola', hits: 5, misses: 2, timesPlayed: 7, currentCycle: 2 }),
      makeAssociation({ id: '2', term: 'HOLA', hits: 3, misses: 1, timesPlayed: 4, currentCycle: 3 }),
    ];

    const normalized = normalizeAssociations(associations);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].hits).toBe(5);
    expect(normalized[0].misses).toBe(2);
    expect(normalized[0].timesPlayed).toBe(7);
    expect(normalized[0].currentCycle).toBe(3);
  });

  it('preserves isLearned/isArchived with OR logic', () => {
    const associations: Association[] = [
      makeAssociation({ id: '1', term: 'Test', isLearned: false, isArchived: false }),
      makeAssociation({ id: '2', term: 'TEST', isLearned: true, isArchived: false }),
    ];

    const normalized = normalizeAssociations(associations);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].isLearned).toBe(true);
    expect(normalized[0].isArchived).toBe(false);
  });

  it('preserves max lastPlayedAt and updatedAt, min createdAt', () => {
    const now = Date.now();
    const associations: Association[] = [
      makeAssociation({ id: '1', term: 'Term', lastPlayedAt: now - 1000, updatedAt: now - 500, createdAt: now - 2000 }),
      makeAssociation({ id: '2', term: 'TERM', lastPlayedAt: now, updatedAt: now - 100, createdAt: now - 3000 }),
    ];

    const normalized = normalizeAssociations(associations);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].lastPlayedAt).toBe(now);
    expect(normalized[0].updatedAt).toBe(now - 100);
    expect(normalized[0].createdAt).toBe(now - 3000);
  });

  it('preserves worst status (correct > pending)', () => {
    const associations: Association[] = [
      makeAssociation({ id: '1', term: 'Word', status: 'pending' }),
      makeAssociation({ id: '2', term: 'WORD', status: 'correct' }),
    ];

    const normalized = normalizeAssociations(associations);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].status).toBe('correct');
  });

  it('merges definitions correctly', () => {
    const associations: Association[] = [
      makeAssociation({ id: '1', term: 'Apple', definition: ['manzana'] }),
      makeAssociation({ id: '2', term: 'APPLE', definition: ['pomme', 'manzana'] }),
    ];

    const normalized = normalizeAssociations(associations);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].definition).toEqual(expect.arrayContaining(['manzana', 'pomme']));
  });

  it('handles undefined progress fields gracefully', () => {
    const associations: Association[] = [
      makeAssociation({ id: '1', term: 'Test', hits: undefined, misses: undefined, timesPlayed: undefined }),
      makeAssociation({ id: '2', term: 'TEST', hits: 2, misses: 1, timesPlayed: 3 }),
    ];

    const normalized = normalizeAssociations(associations);

    expect(normalized).toHaveLength(1);
    expect(normalized[0].hits).toBe(2);
    expect(normalized[0].misses).toBe(1);
    expect(normalized[0].timesPlayed).toBe(3);
  });

  it('does not modify already normalized associations (idempotent)', () => {
    const associations: Association[] = [
      makeAssociation({ term: 'Normalized', definition: ['def1'], hits: 3, currentCycle: 2 }),
    ];

    const firstPass = normalizeAssociations(associations);
    const secondPass = normalizeAssociations(firstPass);

    expect(secondPass).toBe(firstPass);
  });
});