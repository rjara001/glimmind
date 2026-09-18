import { Association, AssociationList, ListSettings } from '../types';
import { DeckSourceType } from '../types/youtube-deck';
import { SourceRow } from '../types/source-row';
import { listService as firestoreListService } from './firestoreService';
import { QuotaService, quotaService } from './quotaService';
import { activityService } from './activityService';
import { createActivityEvent, buildListDiffEvents } from '../utils/activity';
import { QuotaStatus } from '../types/quota';
import { QuotaExceededError, ListNotFoundError } from '../types/list-service';

export class ListServiceImpl {
  constructor(
    private firestore = firestoreListService,
    private activity = activityService
  ) {}

  async createList(input: {
    name: string;
    concept: string;
    associations: Association[];
    userId: string;
    settings: ListSettings;
    sourceType?: DeckSourceType;
    sourceUrl?: string;
    rawSourceText?: string;
    sourceRow?: SourceRow;
  }): Promise<string> {
    const status = await this.checkQuota(input.userId, input.associations.length);
    if (status.level === 'blocked') {
      throw new QuotaExceededError(status.maxCards);
    }

    const id = await this.firestore.createList({
      name: input.name,
      concept: input.concept,
      associations: input.associations,
      settings: input.settings,
      userId: input.userId,
      isArchived: false,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      rawSourceText: input.rawSourceText,
      sourceRow: input.sourceRow,
    });

    await this.activity.recordCardsCreated(input.userId, id, input.associations);

    return id;
  }

  async updateList(input: {
    id: string;
    name?: string;
    concept?: string;
    associations?: Association[];
    settings?: ListSettings;
    isArchived?: boolean;
  }): Promise<void> {
    const existing = await this.firestore.getList(input.id);
    if (!existing) {
      throw new ListNotFoundError(input.id);
    }

    if (input.associations && input.associations.length > existing.associations.length) {
      const status = await this.checkQuota(existing.userId, input.associations.length);
      if (status.level === 'blocked') {
        throw new QuotaExceededError(status.maxCards);
      }
    }

    if (input.associations) {
      const events = buildListDiffEvents({
        userId: existing.userId,
        listId: input.id,
        before: existing.associations,
        after: input.associations,
      });
      await this.activity.recordEvents(existing.userId, events);
    }

    await this.firestore.updateList(input.id, input);
  }

  async deleteList(id: string): Promise<void> {
    await this.firestore.deleteList(id);
  }

  async splitList(listId: string, groups: { name: string; associations: Association[] }[]): Promise<string[]> {
    const list = await this.firestore.getList(listId);
    if (!list) {
      throw new ListNotFoundError(listId);
    }

    const newIds = await this.firestore.splitList(listId, groups);

    const events = groups.flatMap((g, i) =>
      g.associations.map(a =>
        createActivityEvent({
          userId: list.userId,
          listId: newIds[i],
          cardId: a.id,
          cardTerm: a.term,
          type: 'card_moved',
          fromListId: listId,
          toListId: newIds[i],
        })
      )
    );
    await this.activity.recordEvents(list.userId, events);

    return newIds;
  }

  async getList(id: string): Promise<AssociationList | null> {
    return this.firestore.getList(id);
  }

  private async checkQuota(userId: string, projectedCards: number): Promise<QuotaStatus> {
    const userQuota = await quotaService.fetchQuota(userId);
    if (!userQuota) {
      return {
        currentCards: 0,
        maxCards: QuotaService.getMaxCards('free'),
        usageRatio: 0,
        percentage: 0,
        level: 'ok',
        isAiBlocked: false,
        isManualBlocked: false,
        remainingCards: QuotaService.getMaxCards('free'),
      };
    }
    return QuotaService.getStatus(projectedCards, userQuota.tier);
  }
}

export const listService = new ListServiceImpl();