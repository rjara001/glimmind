import { describe, it, expect } from 'vitest';
import { captureMultivalues, captureMultivaluesForMany, mergeRepeatedTermAssociations } from '@/utils/multivalueParser';
import { flattenAssociations } from '@/utils/flattenAssociations';
import { Association } from '@/types';

const createAssociation = (term: string, definition: string, overrides: Partial<Association> = {}): Association => ({
  id: crypto.randomUUID(),
  term,
  definition,
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  ...overrides,
});

describe('captureMultivalues', () => {
  it('captures slash-separated definitions as multivalues', () => {
    const association = createAssociation("I'm down", 'Estoy de acuerdo/Me copa');

    const result = captureMultivalues(association);

    expect(result.multivalues).toEqual(['Estoy de acuerdo', 'Me copa']);
  });

  it('leaves single definitions untouched', () => {
    const association = createAssociation('hello', 'hola');

    const result = captureMultivalues(association);

    expect(result).toBe(association);
  });

  it('keeps existing multivalues without recomputing', () => {
    const association = createAssociation('hello', 'a/b', { multivalues: ['custom'] });

    const result = captureMultivalues(association);

    expect(result.multivalues).toEqual(['custom']);
  });

  it('does not capture multivalues when both sides are multi-valued', () => {
    const association = createAssociation('a/b', '1/2');

    const result = captureMultivalues(association);

    expect(result.multivalues).toBeUndefined();
  });
});

describe('captureMultivaluesForMany', () => {
  it('returns the same array when nothing changed', () => {
    const associations = [createAssociation('a', '1')];

    const result = captureMultivaluesForMany(associations);

    expect(result).toBe(associations);
  });
});

describe('flattenAssociations guard', () => {
  it('never flattens an association that carries multivalues', () => {
    const associations = [
      createAssociation('A', 'B/C/D', { multivalues: ['B', 'C', 'D'] }),
    ];

    const result = flattenAssociations(associations);

    expect(result).toBe(associations);
    expect(result[0].definition).toBe('B/C/D');
  });

  it('still flattens legacy associations without multivalues', () => {
    const associations = [createAssociation('A', 'B/C/D')];

    const result = flattenAssociations(associations);

    expect(result.length).toBe(3);
  });
});

describe('mergeRepeatedTermAssociations', () => {
  it('merges rows sharing the same term into one multivalue card', () => {
    const associations = [
      createAssociation("I'm down", 'Estoy de acuerdo'),
      createAssociation("I'm down", 'Me copa'),
    ];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result.length).toBe(1);
    expect(result[0].term).toBe("I'm down");
    expect(result[0].multivalues).toEqual(['Estoy de acuerdo', 'Me copa']);
  });

  it('leaves unique terms untouched', () => {
    const associations = [
      createAssociation('A', '1'),
      createAssociation('B', '2'),
    ];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result).toBe(associations);
  });

  it('merges case-insensitively and trims', () => {
    const associations = [
      createAssociation('  Hello ', 'hola'),
      createAssociation('hello', 'saludos'),
    ];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result.length).toBe(1);
    expect(result[0].term).toBe('Hello');
    expect(result[0].multivalues).toEqual(['hola', 'saludos']);
  });

  it('deduplicates repeated definitions inside a merge', () => {
    const associations = [
      createAssociation('Hello', 'hola'),
      createAssociation('Hello', 'hola'),
    ];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result.length).toBe(1);
    expect(result[0].multivalues).toEqual(['hola']);
  });

  it('folds existing multivalues into the merged card', () => {
    const associations = [
      createAssociation('A', 'B/C', { multivalues: ['B', 'C'] }),
      createAssociation('A', 'D'),
    ];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result.length).toBe(1);
    expect(result[0].multivalues).toEqual(['B', 'C', 'D']);
  });

  it('resets progress on the merged card', () => {
    const associations = [
      createAssociation('A', '1', {
        currentCycle: 3,
        status: 'correct',
        isLearned: true,
        hits: 5,
        misses: 2,
      }),
      createAssociation('A', '2'),
    ];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result[0].currentCycle).toBe(1);
    expect(result[0].status).toBe('pending');
    expect(result[0].isLearned).toBe(false);
    expect(result[0].hits).toBeUndefined();
    expect(result[0].misses).toBeUndefined();
  });

  it('keeps archived rows separate and unchanged', () => {
    const archived = createAssociation('A', '1', { isArchived: true });
    const active = createAssociation('A', '2');
    const associations = [archived, active];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result).toContain(archived);
    expect(result.find((a) => a.isArchived)).toBe(archived);
    expect(result.length).toBe(2);
  });

  it('does not merge multi-term rows', () => {
    const associations = [
      createAssociation('A/B', '1'),
      createAssociation('A/B', '2'),
    ];

    const result = mergeRepeatedTermAssociations(associations);

    expect(result).toBe(associations);
  });
});