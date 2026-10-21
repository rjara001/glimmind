import { Association } from '../types';
import { emptyStateBreakdown, stateOf } from './progress';
import { CardActivityEvent, CardLevel, GameSessionSummary } from '../types/activity';
import { joinDefinitions } from './normalizeAssociation';
import { STATE_LABELS } from './cycle-colors';

export const LEVEL_ORDER: CardLevel[] = [
  'nuevas',
  'vistas',
  'reconocidas',
  'frecuentes',
  'aprendidas',
];

export const LEVEL_LABELS: Record<CardLevel, string> = { ...STATE_LABELS };

const LEGACY_LEVEL = 'conocidas';

/**
 * Maps a level read from storage onto the current vocabulary. Activity events
 * written before the cycle-4 rename still store `conocidas`, so every read
 * boundary translates them and consumers only ever see LEVEL_ORDER members.
 */
export function normalizeCardLevel(
  level: CardLevel | string | null | undefined,
): CardLevel | undefined {
  if (!level) return undefined;
  if (level === LEGACY_LEVEL) return 'frecuentes';
  return level in LEVEL_LABELS ? (level as CardLevel) : undefined;
}

export function normalizeActivityEvent(event: CardActivityEvent): CardActivityEvent {
  const fromLevel = normalizeCardLevel(event.fromLevel);
  const toLevel = normalizeCardLevel(event.toLevel);
  if (fromLevel === event.fromLevel && toLevel === event.toLevel) return event;
  return { ...event, fromLevel, toLevel };
}

/**
 * Rebuilds a stored session level histogram under the current keys, folding the
 * legacy `conocidas` count into `frecuentes` instead of dropping it.
 */
export function normalizeByLevel(
  byLevel: (Partial<Record<CardLevel, number>> & { conocidas?: number }) | null | undefined,
): Record<CardLevel, number> {
  const result: Record<CardLevel, number> = { ...emptyStateBreakdown() };
  if (!byLevel) return result;
  for (const level of LEVEL_ORDER) {
    result[level] = byLevel[level] ?? 0;
  }
  if (typeof byLevel.conocidas === 'number') {
    result.frecuentes += byLevel.conocidas;
  }
  return result;
}

export function normalizeSessionSummary(session: GameSessionSummary): GameSessionSummary {
  return { ...session, byLevel: normalizeByLevel(session.byLevel) };
}

/**
 * Returns the mastery level bucket a single association belongs to.
 * Reuses the same mapping as progress stateOf so levels stay consistent.
 */
export function levelOf(association: Association): CardLevel {
  return stateOf(association);
}

/**
 * Returns the position of a level in the progression order.
 */
export function levelIndex(level: CardLevel): number {
  return LEVEL_ORDER.indexOf(level);
}

/**
 * Builds a fully-formed activity event, generating the id and timestamp
 * when they are not provided.
 */
export function createActivityEvent(
  partial: Omit<CardActivityEvent, 'id' | 'at'> & { at?: number },
): CardActivityEvent {
  return {
    id: crypto.randomUUID(),
    at: Date.now(),
    ...partial,
  };
}

/**
 * Fills missing tracking fields (hits/misses/timesPlayed) and timestamps on
 * associations loaded from storage. Returns the same array reference when
 * nothing needed backfilling, so callers can detect "no change".
 */
export function backfillAssociationStats(
  associations: Association[],
  fallbackTimestamp?: number,
): Association[] {
  let changed = false;
  const backfilled = associations.map((association) => {
    const needsHits = association.hits === undefined;
    const needsMisses = association.misses === undefined;
    const needsTimes = association.timesPlayed === undefined;
    const needsCreated = association.createdAt === undefined;
    const needsUpdated = association.updatedAt === undefined;
    if (!needsHits && !needsMisses && !needsTimes && !needsCreated && !needsUpdated) {
      return association;
    }
    changed = true;
    return {
      ...association,
      hits: needsHits ? 0 : association.hits,
      misses: needsMisses ? 0 : association.misses,
      timesPlayed: needsTimes ? 0 : association.timesPlayed,
      createdAt: needsCreated ? fallbackTimestamp : association.createdAt,
      updatedAt: needsUpdated ? fallbackTimestamp : association.updatedAt,
    };
  });
  return changed ? backfilled : associations;
}

export interface ListDiffOptions {
  userId: string;
  listId: string;
  before: Association[];
  after: Association[];
}

/**
 * Compares the associations of a list before and after an edit and produces
 * the corresponding activity events: card_created for new ids, card_updated
 * for term/definition changes, card_archived/card_restored for archive
 * toggles and card_deleted for removed ids. Counters (hits/misses/...)
 * are intentionally ignored, so gameplay updates never generate events.
 */
export function buildListDiffEvents(options: ListDiffOptions): CardActivityEvent[] {
  const { userId, listId, before, after } = options;
  const beforeArray: Association[] = Array.isArray(before) ? before : Object.values(before || {}) as Association[];
  const afterArray: Association[] = Array.isArray(after) ? after : Object.values(after || {}) as Association[];
  const beforeById = new Map(beforeArray.map((association) => [association.id, association]));
  const afterById = new Map(afterArray.map((association) => [association.id, association]));
  const events: CardActivityEvent[] = [];

  for (const current of afterArray) {
    const prev = beforeById.get(current.id);
    if (!prev) {
      events.push(
        createActivityEvent({
          userId,
          listId,
          cardId: current.id,
          cardTerm: current.term,
          type: 'card_created',
        }),
      );
      continue;
    }
    if (prev.isArchived && !current.isArchived) {
      events.push(
        createActivityEvent({
          userId,
          listId,
          cardId: current.id,
          cardTerm: current.term,
          type: 'card_restored',
        }),
      );
    } else if (!prev.isArchived && current.isArchived) {
      events.push(
        createActivityEvent({
          userId,
          listId,
          cardId: current.id,
          cardTerm: current.term,
          type: 'card_archived',
        }),
      );
    }
    if (prev.term !== current.term) {
      events.push(
        createActivityEvent({
          userId,
          listId,
          cardId: current.id,
          cardTerm: current.term,
          type: 'card_updated',
          field: 'term',
          before: prev.term,
          after: current.term,
        }),
      );
    }
    if (joinDefinitions(prev.definition) !== joinDefinitions(current.definition)) {
      events.push(
        createActivityEvent({
          userId,
          listId,
          cardId: current.id,
          cardTerm: current.term,
          type: 'card_updated',
          field: 'definition',
          before: joinDefinitions(prev.definition),
          after: joinDefinitions(current.definition),
        }),
      );
    }
  }

  for (const prev of beforeArray) {
    if (!afterById.has(prev.id)) {
      events.push(
        createActivityEvent({
          userId,
          listId,
          cardId: prev.id,
          cardTerm: prev.term,
          type: 'card_deleted',
        }),
      );
    }
  }

  return events;
}
