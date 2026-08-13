import { describe, it, expect } from 'vitest';
import { Association } from '../types';
import {
  LEVEL_ORDER,
  LEVEL_LABELS,
  levelOf,
  levelIndex,
  createActivityEvent,
  backfillAssociationStats,
  buildListDiffEvents,
} from './activity';

const createAssociation = (overrides: Partial<Association> = {}): Association => ({
  id: '1',
  term: 'Term',
  definition: 'Definition',
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  ...overrides,
});

describe('levelOf', () => {
  it('maps learned cards to aprendidas', () => {
    expect(levelOf(createAssociation({ isLearned: true, currentCycle: 1 }))).toBe('aprendidas');
  });

  it('maps cycle 4 to conocidas', () => {
    expect(levelOf(createAssociation({ currentCycle: 4 }))).toBe('conocidas');
  });

  it('maps cycle 3 to reconocidas', () => {
    expect(levelOf(createAssociation({ currentCycle: 3 }))).toBe('reconocidas');
  });

  it('maps cycle 2 to vistas', () => {
    expect(levelOf(createAssociation({ currentCycle: 2 }))).toBe('vistas');
  });

  it('maps default cycle to nuevas', () => {
    expect(levelOf(createAssociation({ currentCycle: 1 }))).toBe('nuevas');
  });
});

describe('levelIndex', () => {
  it('orders levels from new to learned', () => {
    expect(LEVEL_ORDER).toEqual([
      'nuevas',
      'vistas',
      'reconocidas',
      'conocidas',
      'aprendidas',
    ]);
    expect(levelIndex('nuevas')).toBe(0);
    expect(levelIndex('aprendidas')).toBe(4);
  });

  it('exposes a Spanish label for every level', () => {
    for (const level of LEVEL_ORDER) {
      expect(LEVEL_LABELS[level]).toBeTruthy();
    }
  });
});

describe('createActivityEvent', () => {
  it('generates an id and timestamp when not provided', () => {
    const event = createActivityEvent({
      userId: 'u1',
      listId: 'l1',
      cardId: 'c1',
      cardTerm: 'Term',
      type: 'card_answered',
      correct: true,
    });
    expect(event.id).toBeTruthy();
    expect(event.at).toBeGreaterThan(0);
    expect(event.type).toBe('card_answered');
    expect(event.correct).toBe(true);
  });

  it('honors an explicit timestamp', () => {
    const event = createActivityEvent({
      userId: 'u1',
      listId: 'l1',
      cardId: 'c1',
      cardTerm: 'Term',
      type: 'card_created',
      at: 1234,
    });
    expect(event.at).toBe(1234);
  });
});

describe('backfillAssociationStats', () => {
  it('fills missing counters and timestamps', () => {
    const list = [createAssociation({ hits: undefined, misses: undefined, timesPlayed: undefined })];
    const backfilled = backfillAssociationStats(list, 42);
    expect(backfilled[0].hits).toBe(0);
    expect(backfilled[0].misses).toBe(0);
    expect(backfilled[0].timesPlayed).toBe(0);
    expect(backfilled[0].createdAt).toBe(42);
    expect(backfilled[0].updatedAt).toBe(42);
  });

  it('keeps existing counter values untouched', () => {
    const list = [createAssociation({ hits: 5, misses: 2, timesPlayed: 7, createdAt: 1, updatedAt: 2 })];
    const backfilled = backfillAssociationStats(list, 42);
    expect(backfilled[0]).toEqual(list[0]);
    expect(backfilled).toBe(list);
  });

  it('returns the same reference when nothing needs backfilling', () => {
    const list = [createAssociation({ hits: 1, misses: 0, timesPlayed: 1, createdAt: 1, updatedAt: 1 })];
    expect(backfillAssociationStats(list, 42)).toBe(list);
  });
});

describe('buildListDiffEvents', () => {
  it('emits card_created for new ids', () => {
    const before = [createAssociation({ id: 'a' })];
    const after = [
      createAssociation({ id: 'a' }),
      createAssociation({ id: 'b', term: 'New' }),
    ];
    const events = buildListDiffEvents({ userId: 'u1', listId: 'l1', before, after });
    const created = events.filter((e) => e.type === 'card_created');
    expect(created).toHaveLength(1);
    expect(created[0].cardId).toBe('b');
    expect(created[0].cardTerm).toBe('New');
  });

  it('emits card_updated with before/after per changed field', () => {
    const before = [createAssociation({ id: 'a', term: 'One', definition: 'Def' })];
    const after = [createAssociation({ id: 'a', term: 'Two', definition: 'Changed' })];
    const events = buildListDiffEvents({ userId: 'u1', listId: 'l1', before, after });
    const updated = events.filter((e) => e.type === 'card_updated');
    expect(updated).toHaveLength(2);
    expect(updated).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'term', before: 'One', after: 'Two' }),
        expect.objectContaining({ field: 'definition', before: 'Def', after: 'Changed' }),
      ]),
    );
  });

  it('emits card_archived and card_restored on archive toggles', () => {
    const before = [
      createAssociation({ id: 'a', isArchived: false }),
      createAssociation({ id: 'b', isArchived: true }),
    ];
    const after = [
      createAssociation({ id: 'a', isArchived: true }),
      createAssociation({ id: 'b', isArchived: false }),
    ];
    const events = buildListDiffEvents({ userId: 'u1', listId: 'l1', before, after });
    expect(events.some((e) => e.type === 'card_archived' && e.cardId === 'a')).toBe(true);
    expect(events.some((e) => e.type === 'card_restored' && e.cardId === 'b')).toBe(true);
  });

  it('emits card_deleted for removed ids', () => {
    const before = [
      createAssociation({ id: 'a' }),
      createAssociation({ id: 'b' }),
    ];
    const after = [createAssociation({ id: 'a' })];
    const events = buildListDiffEvents({ userId: 'u1', listId: 'l1', before, after });
    const deleted = events.filter((e) => e.type === 'card_deleted');
    expect(deleted).toHaveLength(1);
    expect(deleted[0].cardId).toBe('b');
  });

  it('ignores counter-only changes (gameplay) so no events are generated', () => {
    const before = [createAssociation({ id: 'a', hits: 0, misses: 0, timesPlayed: 0 })];
    const after = [createAssociation({ id: 'a', hits: 3, misses: 1, timesPlayed: 4, lastPlayedAt: 123 })];
    const events = buildListDiffEvents({ userId: 'u1', listId: 'l1', before, after });
    expect(events).toEqual([]);
  });
});
