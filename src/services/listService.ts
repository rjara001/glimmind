import { QuotaExceededError, ListNotFoundError } from '../errors/listErrors';
import { Association, AssociationList, ListSettings } from '../types';
import type { BulkCreateListsInput } from '../types/list-service';
import { DeckSourceType } from '../types/youtube-deck';
import { SourceRow } from '../types/source-row';
import { listService as firestoreListService } from './firestoreService';
import { QuotaService, quotaService } from './quotaService';
import { activityService } from './activityService';
import { createActivityEvent, buildListDiffEvents } from '../utils/activity';
import { logEvent } from './errorReporting';
import { QuotaStatus } from '../types/quota';
import { AssociationDelta } from '../utils/syncDelta';
import { MAX_CARDS_PER_DECK } from '../constants/limits';


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
    if (input.associations.length > status.maxCards) {
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

    await this.recordActivitySafely(
      () => this.activity.recordCardsCreated(input.userId, id, input.associations),
      'createList',
    );

    return id;
  }

  // Single bulk import: one HTTP round-trip for the whole payload. The server
  // splits the cards into decks and persists them atomically, so this never
  // stops halfway against the createList rate limit (the old client-side loop
  // died at 2000 cards: 20 decks x 100 cards, rate limit 20/min).
  async bulkCreateLists(input: BulkCreateListsInput): Promise<string[]> {
    const status = await this.checkQuota(input.userId, input.associations.length);
    if (input.associations.length > status.maxCards) {
      throw new QuotaExceededError(status.maxCards);
    }

    const ids = await this.firestore.bulkCreateLists(input);

    // Best-effort: a failed activity write must not report the import itself
    // as failed, the decks are already persisted at this point.
    const deckSize = input.cardsPerDeck ?? MAX_CARDS_PER_DECK;
    const events = ids.flatMap((listId, deckIndex) =>
      input.associations
        .slice(deckIndex * deckSize, (deckIndex + 1) * deckSize)
        .map((association) =>
          createActivityEvent({
            userId: input.userId,
            listId,
            cardId: association.id,
            cardTerm: association.term,
            type: 'card_created',
          }),
        ),
    );
    await this.recordActivitySafely(
      () => this.activity.recordEvents(input.userId, events),
      'bulkCreateLists',
    );

    return ids;
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

    if (input.associations && input.associations.length > (existing.associations?.length || 0)) {
      const status = await this.checkQuota(existing.userId, input.associations.length);
      if (input.associations.length > status.maxCards) {
        throw new QuotaExceededError(status.maxCards);
      }
    }

    // The list write is the primary operation; the activity history is
    // telemetry. Recording first let a failed appendActivity veto the write
    // and silently discard the user's edit (P1 2026-10-12).
    await this.firestore.updateList(input.id, input);

    if (input.associations) {
      const events = buildListDiffEvents({
        userId: existing.userId,
        listId: input.id,
        before: existing.associations || [],
        after: input.associations,
      });
      await this.recordActivitySafely(
        () => this.activity.recordEvents(existing.userId, events),
        'updateList',
      );
    }
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
    await this.recordActivitySafely(
      () => this.activity.recordEvents(list.userId, events),
      'splitList',
    );

    return newIds;
  }

  async getList(id: string): Promise<AssociationList | null> {
    return this.firestore.getList(id);
  }

  async updateListFields(listId: string, baseUpdatedAt: number, deltas: AssociationDelta[]): Promise<void> {
    await this.firestore.updateListFields(listId, baseUpdatedAt, deltas);
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

  // The primary write is already durable when this runs: a missing history
  // entry must never undo it. Failures are reported (not rethrown) so the
  // gap is visible in Cloud Logging instead of silently dropped.
  private async recordActivitySafely(record: () => Promise<void>, action: string): Promise<void> {
    try {
      await record();
    } catch (error) {
      console.error(`[listService.${action}] activity recording failed:`, error);
      void logEvent('activity.record_error', {
        message: error instanceof Error ? error.message : String(error),
        error,
        labels: { source: 'listService', action },
      });
    }
  }
}

export const listService = new ListServiceImpl();