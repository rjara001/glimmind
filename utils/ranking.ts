import { Association } from '../types';
import { CardActivityEvent, CardLevel, GameSessionSummary } from '../types/activity';
import { levelOf } from './activity';

export interface RankedCard {
  association: Association;
  listId: string;
  listName: string;
  hits: number;
  misses: number;
  timesPlayed: number;
  accuracy: number;
  level: CardLevel;
}

export interface CardContext {
  association: Association;
  listId: string;
  listName: string;
}

const EMPTY_BY_LEVEL: Record<CardLevel, number> = {
  nuevas: 0,
  vistas: 0,
  reconocidas: 0,
  conocidas: 0,
  aprendidas: 0,
};

function toRanked({ association, listId, listName }: CardContext): RankedCard {
  const hits = association.hits ?? 0;
  const misses = association.misses ?? 0;
  const timesPlayed = association.timesPlayed ?? 0;
  const attempts = hits + misses;
  const accuracy = attempts > 0 ? Math.round((hits / attempts) * 100) : 0;
  return {
    association,
    listId,
    listName,
    hits,
    misses,
    timesPlayed,
    accuracy,
    level: levelOf(association),
  };
}

/**
 * Ranks cards by how many times they were played (most played first).
 * Cards never played are excluded.
 */
export function rankByPlays(cards: CardContext[]): RankedCard[] {
  return cards
    .map(toRanked)
    .filter((card) => card.timesPlayed > 0)
    .sort(
      (a, b) =>
        b.timesPlayed - a.timesPlayed ||
        b.hits - a.hits ||
        a.association.term.localeCompare(b.association.term),
    );
}

/**
 * Ranks cards by fewest correct answers first, then by lowest accuracy.
 * Cards never played are excluded so they do not dominate the report.
 */
export function rankByWeakness(cards: CardContext[]): RankedCard[] {
  return cards
    .map(toRanked)
    .filter((card) => card.timesPlayed > 0)
    .sort(
      (a, b) =>
        a.hits - b.hits ||
        a.accuracy - b.accuracy ||
        a.timesPlayed - b.timesPlayed ||
        a.association.term.localeCompare(b.association.term),
    );
}

/**
 * Groups activity events by sessionId and produces a summary per game session.
 * Events without a sessionId are ignored.
 */
export function summarizeSessions(events: CardActivityEvent[]): GameSessionSummary[] {
  const bySession = new Map<string, CardActivityEvent[]>();
  for (const event of events) {
    if (!event.sessionId) continue;
    const group = bySession.get(event.sessionId);
    if (group) {
      group.push(event);
    } else {
      bySession.set(event.sessionId, [event]);
    }
  }

  const summaries: GameSessionSummary[] = [];
  for (const [sessionId, sessionEvents] of bySession) {
    const playedCards = new Set(sessionEvents.map((event) => event.cardId));
    const correct = sessionEvents.filter(
      (event) => event.type === 'card_answered' && event.correct === true,
    ).length;
    const incorrect = sessionEvents.filter(
      (event) => event.type === 'card_answered' && event.correct === false,
    ).length;
    const byLevel: Record<CardLevel, number> = { ...EMPTY_BY_LEVEL };
    for (const event of sessionEvents) {
      if (event.type === 'card_level_up' && event.toLevel) {
        byLevel[event.toLevel] += 1;
      }
    }
    summaries.push({
      id: sessionId,
      listId: sessionEvents[0].listId,
      listName: '',
      startedAt: Math.min(...sessionEvents.map((event) => event.at)),
      endedAt: Math.max(...sessionEvents.map((event) => event.at)),
      cardsPlayed: playedCards.size,
      correct,
      incorrect,
      byLevel,
    });
  }

  return summaries.sort((a, b) => b.endedAt - a.endedAt);
}
