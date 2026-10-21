import { describe, it, expect } from 'vitest';
import { Association } from '@/types';
import {
  LEVEL_ORDER,
  LEVEL_LABELS,
  levelOf,
  levelIndex,
  createActivityEvent,
  backfillAssociationStats,
  buildListDiffEvents,
  normalizeCardLevel,
  normalizeActivityEvent,
  normalizeByLevel,
  normalizeSessionSummary,
} from '@/utils/activity';
import { CardActivityEvent, GameSessionSummary } from '@/types/activity';

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

  it('maps cycle 4 to frecuentes', () => {
    expect(levelOf(createAssociation({ currentCycle: 4 }))).toBe('frecuentes');
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
      'frecuentes',
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

describe('legacy cycle-4 level normalization', () => {
  it('maps the legacy conocidas level onto frecuentes', () => {
    expect(normalizeCardLevel('conocidas')).toBe('frecuentes');
  });

  it('passes current levels through and rejects unknown values', () => {
    expect(normalizeCardLevel('frecuentes')).toBe('frecuentes');
    expect(normalizeCardLevel('desconocido')).toBeUndefined();
    expect(normalizeCardLevel(undefined)).toBeUndefined();
  });

  it('rewrites the level fields of a stored event', () => {
    const legacy = {
      id: 'e1',
      userId: 'u1',
      listId: 'l1',
      cardId: 'c1',
      cardTerm: 'Term',
      type: 'card_level_up',
      at: 1,
      fromLevel: 'conocidas',
      toLevel: 'aprendidas',
    } as unknown as CardActivityEvent;

    const normalized = normalizeActivityEvent(legacy);

    expect(normalized.fromLevel).toBe('frecuentes');
    expect(normalized.toLevel).toBe('aprendidas');
  });

  it('folds the legacy conocidas count into frecuentes in a session histogram', () => {
    expect(normalizeByLevel({ nuevas: 1, conocidas: 2 })).toEqual({
      nuevas: 1,
      vistas: 0,
      reconocidas: 0,
      frecuentes: 2,
      aprendidas: 0,
    });
    expect(normalizeByLevel({ frecuentes: 3, conocidas: 2 }).frecuentes).toBe(5);
    expect(normalizeByLevel(undefined)).toEqual({
      nuevas: 0,
      vistas: 0,
      reconocidas: 0,
      frecuentes: 0,
      aprendidas: 0,
    });
  });

  it('translates a stored session summary onto the current keys', () => {
    const legacy = {
      id: 's1',
      listId: 'l1',
      listName: 'Lista 1',
      startedAt: 1,
      endedAt: 2,
      cardsPlayed: 2,
      correct: 1,
      incorrect: 1,
      byLevel: { conocidas: 2 },
    } as unknown as GameSessionSummary;

    expect(normalizeSessionSummary(legacy).byLevel).toEqual({
      nuevas: 0,
      vistas: 0,
      reconocidas: 0,
      frecuentes: 2,
      aprendidas: 0,
    });
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
