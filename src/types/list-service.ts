import type { Association, AssociationList, ListSettings } from '../types';
import type { DeckSourceType } from '../types/youtube-deck';
import type { SourceRow } from '../types/source-row';
import type { QuotaStatus } from '../types/quota';
import type { CardActivityEvent } from '../types/activity';

export { QuotaExceededError, ListNotFoundError } from '../errors/listErrors';

export interface CreateListInput {
  name: string;
  concept: string;
  associations: Association[];
  userId: string;
  settings: ListSettings;
  sourceType?: DeckSourceType;
  sourceUrl?: string;
  rawSourceText?: string;
  sourceRow?: SourceRow;
}

export interface UpdateListInput {
  id: string;
  name?: string;
  concept?: string;
  associations?: Association[];
  settings?: ListSettings;
  isArchived?: boolean;
}

export interface SplitListInput {
  listId: string;
  groups: { name: string; associations: Association[] }[];
}

// One HTTP call for a whole import: the server splits `associations` into
// decks of `cardsPerDeck` and persists everything in a single transaction.
export interface BulkCreateListsInput {
  userId: string;
  name: string;
  concept: string;
  associations: Association[];
  settings?: ListSettings;
  cardsPerDeck?: number;
}

// Handler-level request (no userId; settings merged with defaults by the
// caller) shared by useAppHandlers, ListEditor and its import actions.
export interface BulkCreateRequest {
  name: string;
  concept: string;
  associations: Association[];
  settings?: Partial<ListSettings>;
  cardsPerDeck?: number;
}

export type BulkCreateHandler = (input: BulkCreateRequest) => Promise<string[] | null>;

export interface ListService {
  createList(input: CreateListInput): Promise<string>;
  updateList(input: UpdateListInput): Promise<void>;
  deleteList(id: string): Promise<void>;
  splitList(input: SplitListInput): Promise<string[]>;
  getList(id: string): Promise<AssociationList | null>;
}

export interface QuotaService {
  getStatus(currentCards: number, tier: 'free' | 'premium'): QuotaStatus;
  checkQuota(userId: string, projectedCards: number): Promise<QuotaStatus>;
}

export interface ActivityService {
  recordEvents(events: CardActivityEvent[]): Promise<void>;
  recordCardsCreated(userId: string, listId: string, associations: Association[]): Promise<void>;
  recordListDiffEvents(userId: string, listId: string, before: Association[], after: Association[]): Promise<void>;
  recordSplitEvents(userId: string, originalListId: string, groups: { name: string; associations: Association[] }[], newIds: string[]): Promise<void>;
}