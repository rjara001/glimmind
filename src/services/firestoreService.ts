import { Association, AssociationList } from '../types';
import { callFunction, FunctionCallError } from './callFunction';
import { AssociationDelta } from '../utils/syncDelta';

export const listService = {

  fetchListsByUser: async (userId: string): Promise<AssociationList[]> => {
    if (!userId) return [];
    // Errors propagate: swallowing them made loadInitialData treat a failed
    // fetch as an empty account, persist [] and seal the list TTL via
    // markCloudFetch, leaving the dashboard without decks for minutes.
    return await callFunction<AssociationList[]>('getLists', { userId });
  },

  createList: async (list: Omit<AssociationList, 'id'>): Promise<string> => {
    const result = await callFunction<{ id: string }>('createList', {
      name: list.name,
      concept: list.concept,
      associations: list.associations,
      settings: list.settings,
      userId: list.userId,
      sourceType: list.sourceType,
      sourceUrl: list.sourceUrl,
      rawSourceText: list.rawSourceText,
      sourceRow: list.sourceRow,
    });
    return result.id;
  },

  getList: async (listId: string): Promise<AssociationList | null> => {
    try {
      return await callFunction<AssociationList>('getList', { listId });
    } catch (error) {
      return null;
    }
  },

  updateList: async (listId: string, updates: Partial<AssociationList>): Promise<void> => {
    // Errors propagate on purpose: swallowing them made the editor report
    // "Lista guardada" after a write that never reached the cloud
    // (docs/issues/P2/2026-10-15-updatelist-silencia-error-en-nube.md).
    // Callers handle the failure (useAppHandlers.handleUpdateList shows a toast;
    // gameStore.markListCompleted logs it). Guests never reach this function.
    await callFunction('updateList', { listId, ...updates });
  },

  deleteList: async (listId: string): Promise<void> => {
    await callFunction('deleteList', { listId });
  },

  splitList: async (listId: string, groups: { name: string, associations: Association[] }[]): Promise<string[]> => {
    const result = await callFunction<{ ids: string[] }>('splitList', { listId, groups });
    return result.ids;
  },

  updateListFields: async (
    listId: string,
    baseUpdatedAt: number,
    deltas: AssociationDelta[]
  ): Promise<void> => {
    try {
      await callFunction('updateListFields', { listId, baseUpdatedAt, deltas });
    } catch (error) {
      // The 400 body carries zod's fieldErrors; without them the failing field
      // stays invisible and the same payload is retried on every load.
      const fnError = error as Partial<FunctionCallError>;
      if (fnError.fieldErrors) {
        console.error(
          `[listService.updateListFields] rejected for list ${listId}:`,
          fnError.fieldErrors
        );
      }
      throw error;
    }
  }
};
