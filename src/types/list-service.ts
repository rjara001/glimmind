import type { Association, AssociationList, ListSettings } from '../types';
import type { DeckSourceType } from '../types/youtube-deck';
import type { SourceRow } from '../types/source-row';
import type { QuotaStatus } from '../types/quota';
import type { CardActivityEvent } from '../types/activity';

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

export class QuotaExceededError extends Error {
  constructor(public readonly maxCards: number) {
    super(`Quota exceeded. Maximum cards allowed: ${maxCards}`);
    this.name = 'QuotaExceededError';
  }
}

export class ListNotFoundError extends Error {
  constructor(public readonly listId: string) {
    super(`List not found: ${listId}`);
    this.name = 'ListNotFoundError';
  }
}