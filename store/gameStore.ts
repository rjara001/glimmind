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
const LOCAL_STORAGE_BACKUP_KEY = 'glimmind_lists_backup';
const LOCAL_PROGRESS_KEY = 'glimmind_progress';
const GUEST_UID = 'dev-user-local';
const CACHE_ENV_KEY = 'glimmind_cache_env';
const LOCAL_LAST_PLAYED_KEY = 'glimmind_last_played';

function clearLocalCache(): void {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
  localStorage.removeItem(LOCAL_STORAGE_BACKUP_KEY);
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
let syncRequestSequence = 0;

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

function backupLocalLists(): void {
  const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (existing) {
    localStorage.setItem(LOCAL_STORAGE_BACKUP_KEY, existing);
  }
}

function restoreLocalListsFromBackup(): AssociationList[] | null {
  const backup = localStorage.getItem(LOCAL_STORAGE_BACKUP_KEY);
  if (!backup) return null;
  try {
    const parsed = JSON.parse(backup);
    const { lists } = applyFlattening(parsed);
    return lists;
  } catch {
    return null;
  }
}

function getListTimestamp(list: AssociationList): number {
  const raw = list.updatedAt ?? list.createdAt;
  if (!raw) return 0;
  const date = new Date(raw as string | number);
  const ms = date.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function getAssociationTimestamp(association: { updatedAt?: unknown; createdAt?: unknown }): number {
  const raw = association.updatedAt ?? association.createdAt;
  if (!raw) return 0;
  const ms = raw instanceof Date ? raw.getTime() : new Date(raw as string | number).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function mergeSettings(local: AssociationList['settings'], cloud: AssociationList['settings']): AssociationList['settings'] {
  return {
    mode: cloud.mode ?? local.mode,
    flipOrder: cloud.flipOrder ?? local.flipOrder,
    threshold: cloud.threshold ?? local.threshold,
    ignoreArticles: cloud.ignoreArticles ?? local.ignoreArticles,
    showHints: cloud.showHints ?? local.showHints,
    hintMode: cloud.hintMode ?? local.hintMode,
    voiceEnabled: cloud.voiceEnabled ?? local.voiceEnabled,
    voiceTermLang: cloud.voiceTermLang ?? local.voiceTermLang,
    voiceDefLang: cloud.voiceDefLang ?? local.voiceDefLang,
    voiceCommands: cloud.voiceCommands ?? local.voiceCommands,
  };
}

function mergeAssociations(localAssociations: Association[], cloudAssociations: Association[]): Association[] {
  const byId = new Map<string, Association>();
  for (const assoc of cloudAssociations) {
    byId.set(assoc.id, assoc);
  }
  for (const assoc of localAssociations) {
    const existing = byId.get(assoc.id);
    if (!existing || getAssociationTimestamp(assoc) > getAssociationTimestamp(existing)) {
      byId.set(assoc.id, assoc);
    }
  }
  return Array.from(byId.values());
}

function pickLocalOrCloudList(local: AssociationList, cloud: AssociationList): AssociationList {
  const localCount = local.associations?.length || 0;
  const cloudCount = cloud.associations?.length || 0;

  if (cloudCount > localCount && cloudCount >= localCount * 2) {
    return { ...cloud, settings: mergeSettings(local.settings, cloud.settings) };
  }
  if (localCount > cloudCount && localCount >= cloudCount * 2) {
    return { ...local, settings: mergeSettings(local.settings, cloud.settings) };
  }

  const mergedAssociations = mergeAssociations(local.associations || [], cloud.associations || []);
  const localTime = getListTimestamp(local);
  const cloudTime = getListTimestamp(cloud);
  const listData = localTime >= cloudTime ? local : cloud;
  const otherList = localTime >= cloudTime ? cloud : local;

  return { ...listData, associations: mergedAssociations, settings: mergeSettings(otherList.settings, listData.settings) };
}

function mergeCloudWithLocal(
  cloudLists: AssociationList[],
  localLists: AssociationList[],
  currentUserId: string
): AssociationList[] {
  const cloudById = new Map<string, AssociationList>();
  cloudLists.forEach((list) => cloudById.set(list.id, list));

  const localById = new Map<string, AssociationList>();
  localLists.forEach((list) => {
    if (list.userId === currentUserId) {
      localById.set(list.id, list);
    }
  });

  const merged: AssociationList[] = [];

  for (const cloudList of cloudLists) {
    const localList = localById.get(cloudList.id);
    if (!localList) {
      merged.push(cloudList);
      continue;
    }

    const mergedAssociations = mergeAssociations(localList.associations || [], cloudList.associations || []);
    const localTime = getListTimestamp(localList);
    const cloudTime = getListTimestamp(cloudList);
    const listData = localTime > cloudTime ? localList : cloudList;
    const otherList = localTime > cloudTime ? cloudList : localList;

    merged.push({ ...listData, associations: mergedAssociations, settings: mergeSettings(otherList.settings, listData.settings) });
  }

  for (const localList of localLists) {
    if (localList.userId === currentUserId && !cloudById.has(localList.id)) {
      merged.push(localList);
    }
  }

  return merged;
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
  activityRecordingEnabled: boolean;
  
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
  setActivityRecordingEnabled: (enabled: boolean) => void;
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
  activityRecordingEnabled: true,
  
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
    const { settings, activityRecordingEnabled } = get();
    if (!settings.activityHistoryEnabled) return;
    if (!activityRecordingEnabled) return;
    if (!Array.isArray(events) || events.length === 0) return;
    const { user } = get();
    const uid = user && user.uid !== GUEST_UID ? user.uid : '';
    pendingActivityUid = uid;
    pendingActivityEvents = [...pendingActivityEvents, ...events];
    if (activitySaveTimer) {
      clearTimeout(activitySaveTimer);
    }
    activitySaveTimer = setTimeout(flushActivityCloudSave, ACTIVITY_SAVE_DEBOUNCE_MS);
  },

  setActivityRecordingEnabled: (enabled) => {
    set({ activityRecordingEnabled: enabled });
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
    const requestId = ++syncRequestSequence;
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
      console.log('[STORE] Loading from cloud for user:', user.uid, 'cachedListsCount=', get().lists.length);
      if (savedLists && !shouldFetchCloudLists()) {
        console.log('[STORE] Using cached lists (within TTL)');
      } else {
        try {
          backupLocalLists();
          console.log('[STORE] Fetching cloud lists for user:', user.uid);
          const cloudLists = await listService.fetchListsByUser(user.uid);
          if (requestId !== syncRequestSequence) {
            return;
          }
          markCloudFetch();
          console.log('[STORE] Fetched cloud lists count=', cloudLists.length, 'for user=', user.uid);
          if (cloudLists.length > 0) {
            const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
            const currentLocalLists = get().lists;
            const merged = mergeCloudWithLocal(flattenedCloud, currentLocalLists, user.uid);
            console.log('[STORE] Merged lists count=', merged.length, 'changedIds=', changedIds.length);
            set({ lists: merged });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            if (changedIds.length > 0) {
              changedIds.forEach((listId) => get().syncToCloud(listId));
            }
          }
        } catch (error) {
          if (requestId !== syncRequestSequence) {
            return;
          }
          console.error('Error loading from cloud:', error);
          const restored = restoreLocalListsFromBackup();
          if (restored && restored.length > 0) {
            set({ lists: restored });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(restored));
          }
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
    const requestId = ++syncRequestSequence;
    
    set({ isLoading: true });
    try {
      backupLocalLists();
      const cloudLists = await listService.fetchListsByUser(user.uid);
      if (requestId !== syncRequestSequence) {
        return;
      }
      markCloudFetch();
      const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
      const localLists = get().lists;
      const merged = mergeCloudWithLocal(flattenedCloud, localLists, user.uid);
      set({ lists: merged });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      if (changedIds.length > 0) {
        changedIds.forEach((listId) => get().syncToCloud(listId));
      }
    } catch (error) {
      if (requestId !== syncRequestSequence) {
        return;
      }
      console.error('Error syncing from cloud:', error);
      const restored = restoreLocalListsFromBackup();
      if (restored && restored.length > 0) {
        set({ lists: restored });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(restored));
      }
    }
    set({ isLoading: false });
  },
  
  // Sync single list to cloud
  syncToCloud: async (listId) => {
    const { lists, user } = get();
    const localList = lists.find(l => l.id === listId);
    if (!localList || !user || user.uid === GUEST_UID) return;
    
    console.log('[syncToCloud] start listId=', listId, 'localAssocCount=', localList.associations?.length || 0, 'userId=', user.uid);
    
    try {
      const cloudList = await listService.getList(listId);
      console.log('[syncToCloud] cloudList exists=', !!cloudList, 'cloudAssocCount=', cloudList?.associations?.length || 0);
      
      if (!cloudList) {
        console.log('[syncToCloud] cloudList missing, creating with', localList.associations?.length || 0, 'assocs');
        await listService.updateList(localList.id, {
          name: localList.name,
          concept: localList.concept,
          associations: localList.associations,
          settings: localList.settings,
        });
        return;
      }

      const listToSave = pickLocalOrCloudList(localList, cloudList);
      console.log('[syncToCloud] chosen list assocCount=', listToSave.associations?.length || 0, 'updatedAt=', listToSave.updatedAt);
      
      await listService.updateList(listToSave.id, {
        name: listToSave.name,
        concept: listToSave.concept,
        associations: listToSave.associations,
        settings: listToSave.settings,
      });

      const updatedLists = lists.map(l => l.id === listId ? listToSave : l);
      set({ lists: updatedLists });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
    } catch (error) {
      console.error('[syncToCloud] error:', error);
    }
  },
}));
