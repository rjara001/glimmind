export type CardLevel = 'nuevas' | 'vistas' | 'reconocidas' | 'conocidas' | 'aprendidas';

export type CardActivityType =
  | 'card_created'
  | 'card_updated'
  | 'card_archived'
  | 'card_restored'
  | 'card_deleted'
  | 'card_moved'
  | 'card_revealed'
  | 'card_answered'
  | 'card_level_up';

export interface CardActivityEvent {
  id: string;
  userId: string;
  listId: string;
  cardId: string;
  cardTerm: string;
  type: CardActivityType;
  at: number;
  sessionId?: string;
  fromListId?: string;
  toListId?: string;
  field?: 'term' | 'definition';
  before?: string;
  after?: string;
  correct?: boolean;
  similarity?: number;
  fromLevel?: CardLevel;
  toLevel?: CardLevel;
}

export interface GameSessionSummary {
  id: string;
  listId: string;
  listName: string;
  startedAt: number;
  endedAt: number;
  cardsPlayed: number;
  correct: number;
  incorrect: number;
  byLevel: Record<CardLevel, number>;
}
