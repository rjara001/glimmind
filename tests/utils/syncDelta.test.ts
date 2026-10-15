import { describe, it, expect } from 'vitest';
import {
  toEpochMs,
  sanitizeDeltas,
  chunkDeltas,
  computeDelta,
  AssociationDelta,
} from '@/utils/syncDelta';
import { Association } from '@/types';

function makeDelta(overrides: Partial<AssociationDelta> = {}): AssociationDelta {
  return {
    id: 'card-1',
    fields: { currentCycle: 2, hits: 3, misses: 1 },
    updatedAt: 1_728_000_000_000,
    ...overrides,
  };
}

describe('toEpochMs', () => {
  it('rounds a float to an integer', () => {
    expect(toEpochMs(1728000000123.6)).toBe(1728000000124);
  });

  it('keeps an integer as is', () => {
    expect(toEpochMs(1728000000123)).toBe(1728000000123);
  });

  it('parses an ISO string', () => {
    expect(toEpochMs('2024-10-04T00:00:00.000Z')).toBe(Date.parse('2024-10-04T00:00:00.000Z'));
  });

  it('parses a numeric string', () => {
    expect(toEpochMs('1728000000123')).toBe(1728000000123);
  });

  it('converts a Date instance', () => {
    const date = new Date('2024-10-04T00:00:00.000Z');
    expect(toEpochMs(date)).toBe(date.getTime());
  });

  it('returns null for values that are not timestamps', () => {
    expect(toEpochMs(undefined)).toBeNull();
    expect(toEpochMs(null)).toBeNull();
    expect(toEpochMs('not a date')).toBeNull();
    expect(toEpochMs(Number.NaN)).toBeNull();
    expect(toEpochMs(-5)).toBeNull();
    expect(toEpochMs({})).toBeNull();
  });
});

describe('sanitizeDeltas', () => {
  it('drops deltas without a usable id', () => {
    const cleaned = sanitizeDeltas([
      makeDelta({ id: '' }),
      makeDelta({ id: '   ' }),
      makeDelta(),
    ]);

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].id).toBe('card-1');
  });

  it('rounds a float updatedAt to an integer', () => {
    const [cleaned] = sanitizeDeltas([makeDelta({ updatedAt: 1728000000123.7 })]);

    expect(cleaned.updatedAt).toBe(1728000000124);
    expect(Number.isInteger(cleaned.updatedAt)).toBe(true);
  });

  it('converts an ISO string updatedAt into epoch milliseconds', () => {
    const [cleaned] = sanitizeDeltas([makeDelta({ updatedAt: '2024-10-04T00:00:00.000Z' } as never)]);

    expect(cleaned.updatedAt).toBe(Date.parse('2024-10-04T00:00:00.000Z'));
    expect(Number.isInteger(cleaned.updatedAt)).toBe(true);
  });

  it('falls back to now when updatedAt is unusable', () => {
    const before = Date.now();
    const [cleaned] = sanitizeDeltas([makeDelta({ updatedAt: 'garbage' } as never)]);

    expect(cleaned.updatedAt).toBeGreaterThanOrEqual(before);
    expect(cleaned.updatedAt).toBeLessThanOrEqual(Date.now());
  });

  it('clamps currentCycle to at least 1', () => {
    const cleaned = sanitizeDeltas([
      makeDelta({ fields: { currentCycle: 0 } }),
      makeDelta({ id: 'card-2', fields: { currentCycle: 2.4 } }),
    ]);

    expect(cleaned[0].fields.currentCycle).toBe(1);
    expect(cleaned[1].fields.currentCycle).toBe(2);
  });

  it('keeps valid stats and drops non-numeric ones', () => {
    const [cleaned] = sanitizeDeltas([
      makeDelta({ fields: { hits: 2.6, misses: 'x' as never, timesPlayed: 4 } }),
    ]);

    expect(cleaned.fields.hits).toBe(3);
    expect(cleaned.fields.misses).toBeUndefined();
    expect(cleaned.fields.timesPlayed).toBe(4);
  });

  it('drops a status outside the allowed enum', () => {
    const cleaned = sanitizeDeltas([
      makeDelta({ fields: { status: 'wrong' as never } }),
      makeDelta({ id: 'card-2', fields: { status: 'correct' } }),
    ]);

    expect(cleaned[0].fields.status).toBeUndefined();
    expect(cleaned[1].fields.status).toBe('correct');
  });

  it('leaves an already valid delta untouched', () => {
    const delta = makeDelta();
    const [cleaned] = sanitizeDeltas([delta]);

    expect(cleaned).toEqual(delta);
  });

  it('trims the id', () => {
    const [cleaned] = sanitizeDeltas([makeDelta({ id: ' card-1 ' })]);

    expect(cleaned.id).toBe('card-1');
  });
});

describe('chunkDeltas', () => {
  it('splits batches that exceed the server delta cap', () => {
    const deltas: AssociationDelta[] = Array.from({ length: 501 }, (_, index) =>
      makeDelta({ id: `card-${index}`, updatedAt: 1_728_000_000_000 + index })
    );

    const chunks = chunkDeltas(deltas, Number.MAX_SAFE_INTEGER);

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(1);
  });

  it('still splits by payload size when the byte limit is smaller', () => {
    const deltas: AssociationDelta[] = Array.from({ length: 4 }, (_, index) =>
      makeDelta({ id: `card-${index}`, updatedAt: 1_728_000_000_000 + index })
    );

    const chunks = chunkDeltas(deltas, 120);

    expect(chunks.length).toBeGreaterThan(1);
  });
});

describe('computeDelta output satisfies the server schema after sanitising', () => {
  it('repairs an association whose cycle is still 0 and whose timestamp is a float', () => {
    const makeAssociation = (overrides: Partial<Association>): Association =>
      ({
        id: 'card-1',
        term: 'hola',
        definition: ['hello'],
        currentCycle: 1,
        status: 'pending',
        isLearned: false,
        isArchived: false,
        ...overrides,
      }) as Association;

    const prev = [makeAssociation({})];
    const next = [makeAssociation({ currentCycle: 0, updatedAt: 1728000000123.5 })];

    const cleaned = sanitizeDeltas(computeDelta(prev, next));

    expect(cleaned).toHaveLength(1);
    expect(cleaned[0].fields.currentCycle).toBe(1);
    expect(Number.isInteger(cleaned[0].updatedAt)).toBe(true);
  });
});
