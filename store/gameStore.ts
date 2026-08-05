import { create } from 'zustand';
import { AssociationList, Association } from '../types';
import { listService } from '../services/firestoreService';
import { progressService } from '../services/progressService';
import { quotaService } from '../services/quotaService';
import { flattenAssociations } from '../utils/flattenAssociations';
import {
  applyRepaso,
  createDefaultProgress,
  todayKey,
} from '../utils/progress';
import { UserProgress, CelebrationEvent, RepasoContext } from '../types/progress';
import { UserQuota } from '../types/quota';
import {
  PROGRESS_SAVE_DEBOUNCE_MS,
  LIST_CACHE_TTL_MS,
  LAST_CLOUD_FETCH_KEY,
} from '../constants/limits';

const LOCAL_STORAGE_KEY = 'glimmind_lists';
const LOCAL_PROGRESS_KEY = 'glimmind_progress';
const GUEST_UID = 'dev-user-local';

let progressSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingProgress: UserProgress | null = null;
let pendingUserUid: string | null = null;

function flushProgressCloudSave() {
  if (progressSaveTimer) {
    clearTimeout(progressSaveTimer);
    progressSaveTimer = null;
  }
  if (pendingUserUid && pendingProgress) {
    const uid = pendingUserUid;
    const progress = pendingProgress;
    pendingUserUid = null;
    pendingProgress = null;
    progressService.saveProgress(uid, progress).catch((error) => {
      console.error('Error saving progress:', error);
    });
  }
}

if (typeof window !== 'undefined') {
  const handleFlush = () => flushProgressCloudSave();
  window.addEventListener('beforeunload', handleFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushProgressCloudSave();
    }
  });
}

function shouldFetchCloudLists(): boolean {
  const last = Number(localStorage.getItem(LAST_CLOUD_FETCH_KEY) || 0);
  return Date.now() - last > LIST_CACHE_TTL_MS;
}

function markCloudFetch() {
  localStorage.setItem(LAST_CLOUD_FETCH_KEY, String(Date.now()));
}
function flattenList(list: AssociationList): { list: AssociationList; changed: boolean } {
  if (!list.associations || list.associations.length === 0) {
    return { list, changed: false };
  }
  const associations = flattenAssociations(list.associations);
  if (associations === list.associations) {
    return { list, changed: false };
  }
  return { list: { ...list, associations }, changed: true };
}

function applyFlattening(lists: AssociationList[]): { lists: AssociationList[]; changedIds: string[] } {
  const changedIds: string[] = [];
  const flattenedLists = lists.map((list) => {
    const result = flattenList(list);
    if (result.changed) {
      changedIds.push(list.id);
    }
    return result.list;
  });
  return { lists: flattenedLists, changedIds };
}

interface GameStore {
  // State
  user: any | null;
  lists: AssociationList[];
  currentListId: string | null;
  currentList: AssociationList | null;
  isLoaded: boolean;
  isLoading: boolean;
  progress: UserProgress | null;
  celebration: CelebrationEvent | null;
  quota: UserQuota | null;
  
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
  
  // Actions - Progress
  loadProgress: () => Promise<void>;
  loadQuota: () => Promise<void>;
  recordRepaso: (association: Association, listContext?: RepasoContext) => void;
  setGoalTarget: (target: number) => void;
  clearCelebration: () => void;
  _persistProgress: (progress: UserProgress) => void;
  
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
  progress: null,
  celebration: null,
  quota: null,
  
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
    if (user && user.uid !== GUEST_UID) {
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

  // Progress actions
  loadProgress: async () => {
    const { user } = get();
    const isGuest = !user || user.uid === GUEST_UID;

    const savedLocal = localStorage.getItem(LOCAL_PROGRESS_KEY);
    const localProgress: UserProgress | null = savedLocal ? JSON.parse(savedLocal) : null;

    if (isGuest) {
      set({ progress: localProgress || createDefaultProgress() });
      return;
    }

    const cloudProgress = await progressService.fetchProgress(user.uid);
    const mergedProgress = cloudProgress || localProgress || createDefaultProgress();
    set({ progress: mergedProgress });
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(mergedProgress));
    if (cloudProgress === null) {
      get().setGoalTarget(mergedProgress.goalTarget);
    }
  },

  loadQuota: async () => {
    const { user } = get();
    if (!user || user.uid === GUEST_UID) return;
    const quota = await quotaService.fetchQuota(user.uid);
    set({ quota });
  },

  recordRepaso: (association, listContext) => {
    const progress = get().progress || createDefaultProgress();
    const result = applyRepaso(progress, association, listContext, todayKey());
    if (!result) return;

    set({
      progress: result.progress,
      celebration: result.celebration || get().celebration,
    });

    get()._persistProgress(result.progress);
  },

  setGoalTarget: (target) => {
    const safeTarget = Math.max(1, Math.round(target));
    const { progress, user } = get();
    const current = progress || createDefaultProgress();
    const nextProgress: UserProgress = {
      ...current,
      goalTarget: safeTarget,
      goalStartedAt: todayKey(),
    };
    set({ progress: nextProgress });
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(nextProgress));
    if (user && user.uid !== GUEST_UID) {
      get()._persistProgress(nextProgress);
    }
  },

  clearCelebration: () => {
    set({ celebration: null });
  },

  _persistProgress: (progress) => {
    const { user } = get();
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
    if (user && user.uid !== GUEST_UID) {
      if (progressSaveTimer) {
        clearTimeout(progressSaveTimer);
      }
      pendingUserUid = user.uid;
      pendingProgress = progress;
      progressSaveTimer = setTimeout(flushProgressCloudSave, PROGRESS_SAVE_DEBOUNCE_MS);
    }
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
        const { lists: flattenedParsed } = applyFlattening(parsed);
        set({ lists: flattenedParsed });
        if (flattenedParsed !== parsed) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flattenedParsed));
        }
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    }
    
    // Load from cloud only if NOT guest
    const isGuest = !user || user.uid === GUEST_UID;
    if (!isGuest) {
      console.log('[STORE] Loading from cloud for user:', user.uid);
      if (savedLists && !shouldFetchCloudLists()) {
        console.log('[STORE] Using cached lists (within TTL)');
      } else {
        try {
          const cloudLists = await listService.fetchListsByUser(user.uid);
          markCloudFetch();
          if (cloudLists.length > 0) {
            const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
            set({ lists: flattenedCloud });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flattenedCloud));
            if (changedIds.length > 0) {
              changedIds.forEach((listId) => get().syncToCloud(listId));
            }
          }
        } catch (error) {
          console.error('Error loading from cloud:', error);
        }
      }
    } else {
      console.log('[STORE] Guest mode - using localStorage only');
    }
    
    set({ isLoaded: true, isLoading: false });
  },
  
  // Sync from cloud
  syncFromCloud: async () => {
    const { user } = get();
    if (!user || user.uid === GUEST_UID) return;
    
    set({ isLoading: true });
    try {
      const cloudLists = await listService.fetchListsByUser(user.uid);
      markCloudFetch();
      const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
      set({ lists: flattenedCloud });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(flattenedCloud));
      if (changedIds.length > 0) {
        changedIds.forEach((listId) => get().syncToCloud(listId));
      }
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
