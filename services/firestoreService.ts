import { Association, AssociationList } from '../types';
import { callFunction } from './callFunction';

export const listService = {

  fetchListsByUser: async (userId: string): Promise<AssociationList[]> => {
    if (!userId) return [];
    try {
      return await callFunction<AssociationList[]>('getLists', { userId });
    } catch (error) {
      console.error("Error fetching lists:", error);
      return [];
    }
  },

  createList: async (list: Omit<AssociationList, 'id'>): Promise<string> => {
    const result = await callFunction<{ id: string }>('createList', {
      name: list.name,
      concept: list.concept,
      associations: list.associations,
      settings: list.settings,
      userId: list.userId
    });
    return result.id;
  },

  getList: async (listId: string): Promise<AssociationList | null> => {
    try {
      return await callFunction<AssociationList>('getList', { listId });
    } catch (error) {
      console.error("Error getting list:", error);
      return null;
    }
  },

  updateList: async (listId: string, updates: Partial<AssociationList>): Promise<void> => {
    await callFunction('updateList', { listId, ...updates });
  },

  deleteList: async (listId: string): Promise<void> => {
    await callFunction('deleteList', { listId });
  },

  splitList: async (listId: string, groups: { name: string, associations: Association[] }[]): Promise<string[]> => {
    const result = await callFunction<{ ids: string[] }>('splitList', { listId, groups });
    return result.ids;
  }
};
