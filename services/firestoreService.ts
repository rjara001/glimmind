import { auth } from '../firebase';
import { AssociationList } from '../types';

const FUNCTIONS_BASE = (import.meta as any).env?.VITE_FUNCTIONS_BASE 
  || 'https://us-central1-fladycard-22a3e.cloudfunctions.net';

async function getToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

async function callFunction<T>(functionName: string, data: any): Promise<T> {
  const token = await getToken();
  
  const response = await fetch(`${FUNCTIONS_BASE}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

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
  }
};