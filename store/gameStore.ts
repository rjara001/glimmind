import { create } from 'zustand';
import { AssociationList, Association } from '../types';
import { listService } from '../services/firestoreService';
import { progressService } from '../services/progressService';
import { quotaService } from '../services/quotaService';
import { isUsingEmulators } from '../firebase';
import { flattenAssociations } from '../utils/flattenAssociations';
import { backfillAssociationStats, buildListDiffEvents } from '../utils/activity';
import {
  applyRepaso,
  createDefaultProgress,
  todayKey,
} from '../utils/progress';
import { UserProgress, CelebrationEvent, RepasoContext } from '../types/progress';
import { UserQuota } from '../types/quota';
import { UserSettings, DEFAULT_SETTINGS } from '../types/settings';
import { settingsService } from '../services/settingsService';
import { CardActivityEvent, GameSessionSummary } from '../types/activity';
import { activityService, ActivityQuery } from '../services/activityService';
import {
  PROGRESS_SAVE_DEBOUNCE_MS,
  ACTIVITY_SAVE_DEBOUNCE_MS,
  LIST_CACHE_TTL_MS,
  LAST_CLOUD_FETCH_KEY,
} from '../constants/limits';

const LOCAL_STORAGE_KEY = 'glimmind_lists';
const LOCAL_PROGRESS_KEY = 'glimmind_progress';
const GUEST_UID = 'dev-user-local';
const CACHE_ENV_KEY = 'glimmind_cache_env';
const LOCAL_LAST_PLAYED_KEY = 'glimmind_last_played';

function clearLocalCache(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(LOCAL_PROGRESS_KEY);
  localStorage.removeItem(LOCAL_LAST_PLAYED_KEY);
  localStorage.removeItem(LAST_CLOUD_FETCH_KEY);
}

function ensureCacheMatchesEnvironment(): void {
  const env = isUsingEmulators ? 'emulator' : 'prod';
  if (localStorage.getItem(CACHE_ENV_KEY) !== env) {
    clearLocalCache();
    localStorage.setItem(CACHE_ENV_KEY, env);
  }
}

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

let activitySaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingActivityUid: string | null = null;
let pendingActivityEvents: CardActivityEvent[] = [];

function flushActivityCloudSave() {
  if (activitySaveTimer) {
    clearTimeout(activitySaveTimer);
    activitySaveTimer = null;
  }
  if (pendingActivityUid !== null && pendingActivityEvents.length > 0) {
    const uid = pendingActivityUid;
    const events = pendingActivityEvents;
    pendingActivityUid = null;
    pendingActivityEvents = [];
    activityService.appendEvents(uid, events).catch((error) => {
      console.error('Error recording activity:', error);
    });
  }
}

if (typeof window !== 'undefined') {
  const handleFlush = () => {
    flushProgressCloudSave();
    flushActivityCloudSave();
  };
  window.addEventListener('beforeunload', handleFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushProgressCloudSave();
      flushActivityCloudSave();
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
  const fallbackTimestamp = list.updatedAt
    ? new Date(list.updatedAt as string | number).getTime()
    : undefined;
  const associations = backfillAssociationStats(
    flattenAssociations(list.associations),
    fallbackTimestamp,
  );
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
  settings: UserSettings;
  activity: CardActivityEvent[];
  activityNextCursor?: string;
  activityLoading: boolean;
  sessions: GameSessionSummary[];
  sessionsLoading: boolean;
  
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

  // Actions - Settings
  loadSettings: () => Promise<void>;
  setSettings: (settings: UserSettings) => void;

  // Actions - Activity
  recordActivity: (events: CardActivityEvent[]) => void;
  loadActivity: (query?: ActivityQuery) => Promise<void>;
  saveGameSession: (session: GameSessionSummary) => void;
  loadSessions: () => Promise<void>;
  
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
  settings: { ...DEFAULT_SETTINGS },
  activity: [],
  activityLoading: false,
  sessions: [],
  sessionsLoading: false,
  
  // Computed
  getCurrentList: () => {
    const { lists, currentListId } = get();
    return lists.find(l => l.id === currentListId) || null;
  },
  
  // User actions
  setUser: (user) => {
    set({ user });
    // Persist only genuine local guests; real users are restored by Firebase Auth.
    if (user && user.uid === GUEST_UID) {
      localStorage.setItem('glimmind_guest_user', JSON.stringify(user));
    } else if (!user) {
      localStorage.removeItem('glimmind_guest_user');
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
    const prevList = lists.find(l => l.id === listId);
    if (prevList && user) {
      const events = buildListDiffEvents({
        userId: user.uid,
        listId,
        before: prevList.associations,
        after: associations,
      });
      if (events.length > 0) {
        get().recordActivity(events);
      }
    }
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

  loadSettings: async () => {
    const { user } = get();
    const isGuest = !user || user.uid === GUEST_UID;

    if (isGuest) {
      set({ settings: settingsService.loadLocalSettings() });
      return;
    }

    const cloudSettings = await settingsService.fetchSettings(user.uid);
    const localSettings = settingsService.loadLocalSettings();
    const merged = cloudSettings || localSettings;
    set({ settings: merged });
    settingsService.saveLocalSettings(merged);
  },

  setSettings: (settings) => {
    const { user } = get();
    const nextSettings: UserSettings = { ...settings, updatedAt: Date.now() };
    set({ settings: nextSettings });
    settingsService.saveLocalSettings(nextSettings);
    if (user && user.uid !== GUEST_UID) {
      settingsService.saveSettings(user.uid, nextSettings).catch((error) => {
        console.error('Error saving settings:', error);
      });
    }
  },

  recordActivity: (events) => {
    const { settings, user } = get();
    if (!settings.activityHistoryEnabled) return;
    if (!Array.isArray(events) || events.length === 0) return;
    const uid = user && user.uid !== GUEST_UID ? user.uid : '';
    pendingActivityUid = uid;
    pendingActivityEvents = [...pendingActivityEvents, ...events];
    if (activitySaveTimer) {
      clearTimeout(activitySaveTimer);
    }
    activitySaveTimer = setTimeout(flushActivityCloudSave, ACTIVITY_SAVE_DEBOUNCE_MS);
  },

  loadActivity: async (query) => {
    const { settings, user, activity } = get();
    if (!settings.activityHistoryEnabled) {
      set({ activity: [], activityNextCursor: undefined });
      return;
    }
    const uid = user && user.uid !== GUEST_UID ? user.uid : '';
    set({ activityLoading: true });
    try {
      const page = await activityService.fetchActivity(uid, query);
      const hasCursor = Boolean(query && query.cursor);
      set({
        activity: hasCursor ? [...activity, ...page.events] : page.events,
        activityNextCursor: page.nextCursor,
        activityLoading: false,
      });
    } catch (error) {
      console.error('Error loading activity:', error);
      set({ activityLoading: false });
    }
  },

  saveGameSession: (session) => {
    const { settings, user } = get();
    if (!settings.activityHistoryEnabled) return;
    const uid = user && user.uid !== GUEST_UID ? user.uid : '';
    activityService.saveSession(uid, session).catch((error) => {
      console.error('Error saving session:', error);
    });
  },

  loadSessions: async () => {
    const { settings, user } = get();
    if (!settings.activityHistoryEnabled) {
      set({ sessions: [] });
      return;
    }
    const uid = user && user.uid !== GUEST_UID ? user.uid : '';
    set({ sessionsLoading: true });
    try {
      const sessions = await activityService.fetchSessions(uid);
      set({ sessions, sessionsLoading: false });
    } catch (error) {
      console.error('Error loading sessions:', error);
      set({ sessionsLoading: false });
    }
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

    ensureCacheMatchesEnvironment();
    
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
