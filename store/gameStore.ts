import { create } from 'zustand';
import { AssociationList, Association } from '../types';
import { listService } from '../services/firestoreService';

const LOCAL_STORAGE_KEY = 'glimmind_lists';

interface GameStore {
  // State
  user: any | null;
  lists: AssociationList[];
  currentListId: string | null;
  currentList: AssociationList | null;
  isLoaded: boolean;
  isLoading: boolean;
  
  // Computed (via getters)
  getCurrentList: () => AssociationList | null;
  
  // Actions - User
  setUser: (user: any | null) => void;
  
  // Actions - Lists
  setLists: (lists: AssociationList[]) => void;
  updateAssociations: (listId: string, associations: Association[]) => void;
  
  // Actions - Current List
  setCurrentList: (listId: string | null) => void;
  setCurrentListData: (list: AssociationList) => void;
  
  // Actions - Initialization
  loadInitialData: () => Promise<void>;
  
  // Actions - Persistence
  syncFromCloud: () => Promise<void>;
  syncToCloud: (listId: string) => Promise<void>;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  user: null,
  lists: [],
  currentListId: null,
  currentList: null,
  isLoaded: false,
  isLoading: false,
  
  // Computed
  getCurrentList: () => {
    const { lists, currentListId } = get();
    return lists.find(l => l.id === currentListId) || null;
  },
  
  // User actions
  setUser: (user) => {
    set({ user });
    // Save to localStorage
    if (user) {
      localStorage.setItem('glimmind_guest_user', JSON.stringify(user));
    }
  },
  
  // Lists actions
  setLists: (lists) => {
    set({ lists });
    // Persist to localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lists));
  },
  
  updateAssociations: (listId, associations) => {
    const { lists, user } = get();
    const updatedLists = lists.map(l => 
      l.id === listId ? { ...l, associations } : l
    );
    set({ 
      lists: updatedLists,
      currentList: updatedLists.find(l => l.id === listId) || null
    });
    // Persist to localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
    // Sync to cloud if logged in
    if (user && user.uid !== 'dev-user-local') {
      get().syncToCloud(listId);
    }
  },
  
  setCurrentList: (listId) => {
    set({ currentListId: listId });
  },
  
  setCurrentListData: (list) => {
    const { lists } = get();
    const updatedLists = lists.map(l => l.id === list.id ? list : l);
    set({ 
      lists: updatedLists,
      currentList: list
    });
    // Persist
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
  },
  
  // Initialization
  loadInitialData: async () => {
    const { user } = get();
    set({ isLoading: true });
    
    // Load from localStorage first
    const savedLists = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLists) {
      try {
        const parsed = JSON.parse(savedLists);
        set({ lists: parsed });
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    }
    
    // Load from cloud only if NOT guest
    const isGuest = !user || user.uid === 'dev-user-local';
    if (!isGuest) {
      console.log('[STORE] Loading from cloud for user:', user.uid);
      try {
        const cloudLists = await listService.fetchListsByUser(user.uid);
        if (cloudLists.length > 0) {
          set({ lists: cloudLists });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudLists));
        }
      } catch (error) {
        console.error('Error loading from cloud:', error);
      }
    } else {
      console.log('[STORE] Guest mode - using localStorage only');
    }
    
    set({ isLoaded: true, isLoading: false });
  },
  
  // Sync from cloud
  syncFromCloud: async () => {
    const { user } = get();
    if (!user || user.uid === 'dev-user-local') return;
    
    set({ isLoading: true });
    try {
      const cloudLists = await listService.fetchListsByUser(user.uid);
      set({ lists: cloudLists });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudLists));
    } catch (error) {
      console.error('Error syncing from cloud:', error);
    }
    set({ isLoading: false });
  },
  
  // Sync single list to cloud
  syncToCloud: async (listId) => {
    const { lists } = get();
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    try {
      await listService.updateList(list.id, {
        name: list.name,
        concept: list.concept,
        associations: list.associations,
        settings: list.settings,
      });
    } catch (error) {
      console.error('Error syncing to cloud:', error);
    }
  },
}));
