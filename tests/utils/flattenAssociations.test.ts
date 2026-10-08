import { describe, it, expect } from 'vitest';
import { flattenAssociations } from '../../src/utils/flattenAssociations';
import type { Association } from '../../src/types';

const createAssociation = (term: string, definition: string | string[], overrides: Partial<Association> = {}): Association => ({
  id: crypto.randomUUID(),
  term,
  definition: Array.isArray(definition) ? definition : [definition],
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  ...overrides,
});

describe('flattenAssociations', () => {
  it('returns the same array when no association has slash-separated values', () => {
    const associations = [
      createAssociation('A', '1'),
      createAssociation('B', '2'),
    ];

    const result = flattenAssociations(associations);

    expect(result).toBe(associations);
  });

  it('expands multiple terms against a single definition', () => {
    const associations = [createAssociation('A/B/C', 'D')];

    const result = flattenAssociations(associations);

    expect(result.length).toBe(3);
    expect(result.map(a => [a.term, a.definition[0]])).toEqual([
      ['A', 'D'],
      ['B', 'D'],
      ['C', 'D'],
    ]);
  });

  it('expands a single term against multiple definitions', () => {
    const associations = [createAssociation('A', 'B/C/D')];

    const result = flattenAssociations(associations);

    expect(result.length).toBe(3);
    expect(result.map(a => [a.term, a.definition[0]])).toEqual([
      ['A', 'B'],
      ['A', 'C'],
      ['A', 'D'],
    ]);
  });

  it('pairs terms and definitions by position when both sides have the same count', () => {
    const associations = [createAssociation('A/B/C', '1/2/3')];

    const result = flattenAssociations(associations);

    expect(result.length).toBe(3);
    expect(result.map(a => [a.term, a.definition[0]])).toEqual([
      ['A', '1'],
      ['B', '2'],
      ['C', '3'],
    ]);
  });

  it('leaves the association untouched when both sides have different counts', () => {
    const associations = [createAssociation('A/B/C', '1/2')];

    const result = flattenAssociations(associations);

    expect(result).toBe(associations);
    expect(result[0].term).toBe('A/B/C');
    expect(result[0].definition[0]).toBe('1/2');
  });

  it('trims whitespace around slash-separated parts', () => {
    const associations = [createAssociation(' A / B / C ', 'D')];

    const result = flattenAssociations(associations);

    expect(result.map(a => a.term)).toEqual(['A', 'B', 'C']);
    expect(result.every(a => a.definition[0] === 'D')).toBe(true);
  });

  it('drops empty parts', () => {
    const associations = [createAssociation('A//C', 'D')];

    const result = flattenAssociations(associations);

    expect(result.length).toBe(2);
    expect(result.map(a => a.term)).toEqual(['A', 'C']);
  });

  it('preserves progress fields on expanded associations', () => {
    const associations = [
      createAssociation('A/B', 'D', { currentCycle: 3, status: 'correct', isLearned: true, isArchived: true }),
    ];

    const result = flattenAssociations(associations);

    expect(result.every(a => a.currentCycle === 3)).toBe(true);
    expect(result.every(a => a.status === 'correct')).toBe(true);
    expect(result.every(a => a.isLearned)).toBe(true);
    expect(result.every(a => a.isArchived)).toBe(true);
  });

  it('generates unique ids for expanded associations', () => {
    const associations = [createAssociation('A/B/C', 'D')];

    const result = flattenAssociations(associations);

    const ids = result.map(a => a.id);
    expect(new Set(ids).size).toBe(3);
  });

  it('only expands the associations that need flattening', () => {
    const associations = [
      createAssociation('A/B', 'D'),
      createAssociation('X', 'Y'),
    ];

    const result = flattenAssociations(associations);

    expect(result.length).toBe(3);
    expect(result[2].term).toBe('X');
    expect(result[2].definition[0]).toBe('Y');
  });
});
