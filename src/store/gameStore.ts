import { create } from 'zustand';
import { AssociationList, Association, AppUser, GameState } from '../types';
import { listService } from '../services/firestoreService';
import { progressService } from '../services/progressService';
import { quotaService } from '../services/quotaService';
import { isUsingEmulators, auth } from '../firebase';
import { normalizeAssociations } from '../utils/normalizeAssociation';
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
import { GUEST_UID } from '../constants/app';
import { normalizeVoiceLanguageSettings } from '../services/voice/languages';

const LOCAL_STORAGE_KEY = 'glimmind_lists';
const LOCAL_STORAGE_BACKUP_KEY = 'glimmind_lists_backup';
const LOCAL_PROGRESS_KEY = 'glimmind_progress';
const CACHE_ENV_KEY = 'glimmind_cache_env';
const LOCAL_LAST_PLAYED_KEY = 'glimmind_last_played';
const syncToCloudInFlight = new Map<string, Promise<void>>();

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

function shouldFetchCloudLists(uid: string): boolean {
  const last = Number(localStorage.getItem(`${LAST_CLOUD_FETCH_KEY}_${uid}`) || 0);
  return Date.now() - last > LIST_CACHE_TTL_MS;
}

function markCloudFetch(uid: string) {
  localStorage.setItem(`${LAST_CLOUD_FETCH_KEY}_${uid}`, String(Date.now()));
}
function flattenList(list: AssociationList): { list: AssociationList; changed: boolean } {
  if (!list.associations || list.associations.length === 0) {
    return { list, changed: false };
  }
  const fallbackTimestamp = list.updatedAt
    ? new Date(list.updatedAt as string | number).getTime()
    : undefined;
  const associations = backfillAssociationStats(
    normalizeAssociations(list.associations),
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

function mergeSettings(older: AssociationList['settings'], newer: AssociationList['settings']): AssociationList['settings'] {
  return {
    mode: newer.mode ?? older.mode,
    flipOrder: newer.flipOrder ?? older.flipOrder,
    threshold: newer.threshold ?? older.threshold,
    ignoreArticles: newer.ignoreArticles ?? older.ignoreArticles,
    showHints: newer.showHints ?? older.showHints,
    hintMode: newer.hintMode ?? older.hintMode,
    voiceEnabled: newer.voiceEnabled ?? older.voiceEnabled,
    voiceTermLang: newer.voiceTermLang ?? older.voiceTermLang,
    voiceDefLang: newer.voiceDefLang ?? older.voiceDefLang,
    voiceTermId: newer.voiceTermId ?? older.voiceTermId,
    voiceDefId: newer.voiceDefId ?? older.voiceDefId,
    voiceRate: newer.voiceRate ?? older.voiceRate,
    voicePitch: newer.voicePitch ?? older.voicePitch,
    voiceCommands: newer.voiceCommands ?? older.voiceCommands,
    ttsProvider: newer.ttsProvider ?? older.ttsProvider,
    sttProvider: newer.sttProvider ?? older.sttProvider,
    autoRevealAfterSeconds: newer.autoRevealAfterSeconds ?? older.autoRevealAfterSeconds,
    autoAdvanceAfterAttempts: newer.autoAdvanceAfterAttempts ?? older.autoAdvanceAfterAttempts,
  };
}

function trackingScore(association: { hits?: number; misses?: number; timesPlayed?: number }): number {
  return (association.hits ?? 0) + (association.misses ?? 0) + (association.timesPlayed ?? 0);
}

function withNormalizedVoiceLanguages(lists: AssociationList[]): AssociationList[] {
  return lists.map((list) => ({
    ...list,
    settings: normalizeVoiceLanguageSettings(list.concept || '', list.settings),
  }));
}

export function mergeAssociations(localAssociations: Association[], cloudAssociations: Association[]): Association[] {
  const byId = new Map<string, Association>();
  for (const assoc of cloudAssociations) {
    byId.set(assoc.id, assoc);
  }
  for (const assoc of localAssociations) {
    const existing = byId.get(assoc.id);
    if (!existing) {
      byId.set(assoc.id, assoc);
      continue;
    }
    const localTime = getAssociationTimestamp(assoc);
    const cloudTime = getAssociationTimestamp(existing);
    if (localTime > cloudTime) {
      byId.set(assoc.id, assoc);
    } else if (localTime === cloudTime && trackingScore(assoc) >= trackingScore(existing)) {
      // On equal timestamps prefer the side with more game progress, then local.
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

export function mergeCloudWithLocalPreferLocal(
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

    // Merge associations preferring local when timestamps are newer
    const mergedAssociations = mergeAssociationsPreferLocal(localList.associations || [], cloudList.associations || []);
    const localTime = getListTimestamp(localList);
    const cloudTime = getListTimestamp(cloudList);
    
    // PREFER LOCAL if local has learned cards that cloud doesn't (progress protection)
    const localLearned = localList.associations?.filter(a => a.isLearned && !a.isArchived).length || 0;
    const cloudLearned = cloudList.associations?.filter(a => a.isLearned && !a.isArchived).length || 0;
    const hasLocalProgress = localLearned > cloudLearned;
    const preferLocalList = hasLocalProgress || localTime >= cloudTime;
    
    const listData = preferLocalList ? localList : cloudList;
    const otherList = preferLocalList ? cloudList : localList;

    merged.push({ ...listData, associations: mergedAssociations, settings: mergeSettings(otherList.settings, listData.settings) });
  }

  for (const localList of localLists) {
    if (localList.userId === currentUserId && !cloudById.has(localList.id)) {
      merged.push(localList);
    }
  }

  return merged;
}

export function mergeAssociationsPreferLocal(localAssociations: Association[], cloudAssociations: Association[]): Association[] {
  const byId = new Map<string, Association>();
  for (const assoc of cloudAssociations) {
    byId.set(assoc.id, assoc);
  }
  for (const assoc of localAssociations) {
    const existing = byId.get(assoc.id);
    if (!existing) {
      byId.set(assoc.id, assoc);
      continue;
    }
    const localTime = getAssociationTimestamp(assoc);
    const cloudTime = getAssociationTimestamp(existing);
    // Prefer local if local has no timestamp (current game state) OR local timestamp >= cloud timestamp
    const preferLocal = localTime === 0 || localTime >= cloudTime;
    if (preferLocal) {
      byId.set(assoc.id, assoc);
    }
  }
  return Array.from(byId.values());
}

interface ResumeSnapshot {
  state: GameState;
  sessionRepasos: number;
}

interface GameStore {
  // State
  user: AppUser | null;
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
  resumeState: Record<string, ResumeSnapshot>;
  
  // Computed (via getters)
  getCurrentList: () => AssociationList | null;
  
  // Actions - User
  setUser: (user: AppUser | null) => void;
  
  // Actions - Lists
  setLists: (lists: AssociationList[]) => void;
  updateAssociations: (listId: string, associations: Association[]) => void;
  markListCompleted: (listId: string) => Promise<void>;
  
  // Actions - Current List
  setCurrentList: (listId: string | null) => void;
  setCurrentListData: (list: AssociationList) => void;
  saveResumeState: (listId: string, snapshot: ResumeSnapshot) => void;
  clearResumeState: (listId: string) => void;
  clearAllResumeState: () => void;
  
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
  resumeState: {},
  
  // Computed
  getCurrentList: () => {
    const { lists, currentListId } = get();
    return lists.find(l => l.id === currentListId) || null;
  },
  
  // User actions
  setUser: (user) => {
    const prevUser = get().user;
    const isSwitch = prevUser?.uid !== user?.uid;

    set({ user });

    // Persist only genuine local guests; real users are restored by Firebase Auth.
    if (user && user.uid === GUEST_UID) {
      localStorage.setItem('glimmind_guest_user', JSON.stringify(user));
    } else if (!user) {
      localStorage.removeItem('glimmind_guest_user');
    }

    // When the user changes, reset all user-dependent state so the new
    // user starts from a clean slate instead of seeing stale data.
    if (isSwitch) {
      set({
        lists: [],
        currentListId: null,
        currentList: null,
        progress: null,
        quota: null,
        activity: [],
        activityNextCursor: undefined,
        sessions: [],
        isLoaded: false,
        isLoading: false,
      });
    }
  },
  
  // Lists actions
  setLists: (lists) => {
    // Normalize legacy lists missing voice languages so flags/narration never fall back to the globe.
    const normalizedLists = withNormalizedVoiceLanguages(lists);
    set({ lists: normalizedLists });
    // Persist to localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedLists));
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
      l.id === listId ? { ...l, associations, updatedAt: Date.now() } : l
    );
    set({
      lists: updatedLists,
      currentList: updatedLists.find(l => l.id === listId) || null
    });
    // Persist to localStorage
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
    if (user && user.uid !== GUEST_UID) {
      get().syncToCloud(listId).catch((error) => {
        console.error('[updateAssociations] syncToCloud failed:', error);
      });
    }
  },

  markListCompleted: async (listId) => {
    const { lists, user } = get();
    const target = lists.find((l) => l.id === listId);
    if (!target) return;
    const now = Date.now();
    const previousHistory = target.history ?? {};
    if (previousHistory.completedAt) {
      return;
    }
    const nextHistory = {
      ...previousHistory,
      completedAt: previousHistory.completedAt ?? now,
      lastCompletedAt: now,
      completedCount: (previousHistory.completedCount ?? 0) + 1,
    };
    const updatedLists = lists.map((l) =>
      l.id === listId ? { ...l, history: nextHistory } : l,
    );
    set({
      lists: updatedLists,
      currentList: updatedLists.find((l) => l.id === listId) || null,
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
    if (user && user.uid !== GUEST_UID) {
      try {
        const { listService } = await import('../services/firestoreService');
        await listService.updateList(listId, { history: nextHistory });
      } catch (error) {
        console.error('[markListCompleted] cloud sync failed:', error);
      }
    }
  },
  
  setCurrentList: (listId) => {
    set({ currentListId: listId });
  },
  
  saveResumeState: (listId, snapshot) => {
    set((current) => ({
      resumeState: { ...current.resumeState, [listId]: snapshot },
    }));
  },

  clearResumeState: (listId) => {
    set((current) => {
      if (!current.resumeState[listId]) return current;
      const next = { ...current.resumeState };
      delete next[listId];
      return { resumeState: next };
    });
  },

  clearAllResumeState: () => {
    set({ resumeState: {} });
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

    if (isGuest) {
      const savedLocal = localStorage.getItem(LOCAL_PROGRESS_KEY);
      const localProgress: UserProgress | null = savedLocal ? JSON.parse(savedLocal) : null;
      set({ progress: localProgress || createDefaultProgress() });
      return;
    }

    // For authenticated users, cloud is the source of truth.
    const cloudProgress = await progressService.fetchProgress(user.uid);
    const progress = cloudProgress || createDefaultProgress();
    set({ progress });
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
    if (cloudProgress === null) {
      get().setGoalTarget(progress.goalTarget);
    }
  },

  loadQuota: async () => {
    const { user } = get();
    if (!user || user.uid === GUEST_UID) return;
    const token = await auth.currentUser?.getIdToken().catch(() => null);
    if (!token) return;
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

    // For authenticated users, cloud is the source of truth.
    const cloudSettings = await settingsService.fetchSettings(user.uid);
    const settings = cloudSettings || { ...DEFAULT_SETTINGS, updatedAt: Date.now() };
    set({ settings });
    settingsService.saveLocalSettings(settings);
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

    // Clear stale lists from the previous user before loading new data.
    set({ lists: [] });

    ensureCacheMatchesEnvironment();

    const isGuest = !user || user.uid === GUEST_UID;

    // Load from localStorage first, but only keep lists belonging to the current user.
    const savedLists = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLists) {
      try {
        const parsed = JSON.parse(savedLists);
        const { lists: flattenedParsed } = applyFlattening(parsed);
        // Filter: guests see all local lists, authenticated users see only their own.
        const filteredLists = isGuest
          ? flattenedParsed
          : flattenedParsed.filter((l: AssociationList) => l.userId === user.uid);
        const normalizedParsed = withNormalizedVoiceLanguages(filteredLists);
        set({ lists: normalizedParsed });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedParsed));
      } catch (e) {
        console.error('Error loading from localStorage:', e);
      }
    }

    set({ isLoaded: true, isLoading: false });

    // Load from cloud only if NOT guest
    if (!isGuest) {
      if (savedLists && !shouldFetchCloudLists(user.uid)) {
      } else {
        try {
          backupLocalLists();
          const cloudLists = await listService.fetchListsByUser(user.uid);
          if (requestId !== syncRequestSequence) {
            return;
          }
          markCloudFetch(user.uid);
          // For authenticated users, merge cloud with local respecting latest timestamps.
          // Local changes (from gameplay) have newer updatedAt on associations.
          const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
          const currentLocalLists = get().lists;
          
          // Merge: for each list, pick the version with latest association timestamps
          const merged = mergeCloudWithLocalPreferLocal(flattenedCloud, currentLocalLists, user.uid);
          const normalizedMerged = withNormalizedVoiceLanguages(merged);
          set({ lists: normalizedMerged });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedMerged));
          if (changedIds.length > 0) {
            changedIds.forEach((listId) => {
              get().syncToCloud(listId).catch((error) => {
                console.error('[loadInitialData] syncToCloud failed:', error);
              });
            });
          }

          // Fetch and merge progress, quota, settings for authenticated users
          try {
            const [cloudProgressResult, cloudQuotaResult, cloudSettingsResult] = await Promise.allSettled([
              progressService.fetchProgress(user.uid),
              quotaService.fetchQuota(user.uid),
              settingsService.fetchSettings(user.uid),
            ]);

            // Progress: last-write-wins by updatedAt (fallback: local wins if cloud missing updatedAt)
            if (cloudProgressResult.status === 'fulfilled' && cloudProgressResult.value) {
              const cloudProgress = cloudProgressResult.value as UserProgress & { updatedAt?: number };
              const localProgressRaw = localStorage.getItem(LOCAL_PROGRESS_KEY);
              const localProgress = localProgressRaw ? JSON.parse(localProgressRaw) as UserProgress & { updatedAt?: number } : null;
              const localUpdatedAt = localProgress?.updatedAt ?? Date.now();
              const cloudUpdatedAt = cloudProgress.updatedAt ?? 0;
              const mergedProgress = localUpdatedAt >= cloudUpdatedAt ? localProgress : cloudProgress;
              if (mergedProgress) {
                const progressToSave = { ...mergedProgress, updatedAt: Math.max(localUpdatedAt, cloudUpdatedAt) };
                set({ progress: progressToSave });
                localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progressToSave));
                // If local was newer, push to cloud in background
                if (localUpdatedAt > cloudUpdatedAt && user.uid !== GUEST_UID) {
                  get()._persistProgress(progressToSave);
                }
              }
            } else if (cloudProgressResult.status === 'rejected') {
              console.warn('[loadInitialData] Failed to fetch cloud progress:', cloudProgressResult.reason);
            }

            // Quota: cloud always wins (server-authoritative)
            if (cloudQuotaResult.status === 'fulfilled' && cloudQuotaResult.value) {
              set({ quota: cloudQuotaResult.value });
            } else if (cloudQuotaResult.status === 'rejected') {
              console.warn('[loadInitialData] Failed to fetch cloud quota:', cloudQuotaResult.reason);
            }

            // Settings: last-write-wins by updatedAt
            if (cloudSettingsResult.status === 'fulfilled' && cloudSettingsResult.value) {
              const cloudSettings = cloudSettingsResult.value;
              const localSettingsRaw = localStorage.getItem('glimmind_settings');
              const localSettings = localSettingsRaw ? JSON.parse(localSettingsRaw) as UserSettings : null;
              const localUpdatedAt = localSettings?.updatedAt ?? Date.now();
              const cloudUpdatedAt = cloudSettings.updatedAt ?? 0;
              const mergedSettings = localUpdatedAt >= cloudUpdatedAt ? localSettings : cloudSettings;
              if (mergedSettings) {
                const settingsToSave = { ...mergedSettings, updatedAt: Math.max(localUpdatedAt, cloudUpdatedAt) };
                set({ settings: settingsToSave });
                settingsService.saveLocalSettings(settingsToSave);
                // If local was newer, push to cloud in background
                if (localUpdatedAt > cloudUpdatedAt && user.uid !== GUEST_UID) {
                  settingsService.saveSettings(user.uid, settingsToSave).catch((err) => {
                    console.error('[loadInitialData] Failed to sync settings to cloud:', err);
                  });
                }
              }
            } else if (cloudSettingsResult.status === 'rejected') {
              console.warn('[loadInitialData] Failed to fetch cloud settings:', cloudSettingsResult.reason);
            }
          } catch (error) {
            console.error('[loadInitialData] Error fetching/merging progress/quota/settings:', error);
          }
        } catch (error) {
          if (requestId !== syncRequestSequence) {
            return;
          }
          console.error('Error loading from cloud:', error);
          const restored = restoreLocalListsFromBackup();
          if (restored && restored.length > 0) {
            const normalizedRestored = withNormalizedVoiceLanguages(restored);
            set({ lists: normalizedRestored });
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedRestored));
          }
        }
      }
    } else {
    }
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
      markCloudFetch(user.uid);
      const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
      const localLists = get().lists;
      const merged = mergeCloudWithLocalPreferLocal(flattenedCloud, localLists, user.uid);
      const normalizedMerged = withNormalizedVoiceLanguages(merged);
      set({ lists: normalizedMerged });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedMerged));
      if (changedIds.length > 0) {
        changedIds.forEach((listId) => {
          get().syncToCloud(listId).catch((error) => {
            console.error('[syncFromCloud] syncToCloud failed:', error);
          });
        });
      }
    } catch (error) {
      if (requestId !== syncRequestSequence) {
        return;
      }
      console.error('Error syncing from cloud:', error);
      const restored = restoreLocalListsFromBackup();
      if (restored && restored.length > 0) {
        const normalizedRestored = withNormalizedVoiceLanguages(restored);
        set({ lists: normalizedRestored });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedRestored));
      }
    }
    set({ isLoading: false });
  },
  
  // Sync single list to cloud
  syncToCloud: async (listId) => {
    const inFlight = syncToCloudInFlight.get(listId);
    if (inFlight) return inFlight;

    const run = (async () => {
      const { lists, user } = get();
      const localList = lists.find(l => l.id === listId);
      if (!localList || !user || user.uid === GUEST_UID) return;

      console.log('[syncToCloud] start listId=', listId, 'localAssocCount=', localList.associations?.length || 0, 'userId=', user.uid);

      const cloudList = await listService.getList(listId);
      console.log('[syncToCloud] cloudList exists=', !!cloudList, 'cloudAssocCount=', cloudList?.associations?.length || 0);

      if (!cloudList) {
        console.log('[syncToCloud] cloudList missing, creating with', localList.associations?.length || 0, 'assocs');
        const newId = await listService.createList({
          name: localList.name,
          concept: localList.concept,
          associations: localList.associations,
          settings: localList.settings,
          userId: user.uid,
          isArchived: false,
          sourceType: localList.sourceType,
          sourceUrl: localList.sourceUrl,
          rawSourceText: localList.rawSourceText,
          sourceRow: localList.sourceRow,
        });
        const freshLists = get().lists;
        const updatedLists = freshLists.map(l => l.id === listId ? { ...l, id: newId } : l);
        set({
          lists: updatedLists,
          ...(get().currentListId === listId
            ? { currentListId: newId, currentList: updatedLists.find(l => l.id === newId) ?? null }
            : {}),
        });
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
        return;
      }

      const listToSave = pickLocalOrCloudList(localList, cloudList);
      console.log('[syncToCloud] chosen list assocCount=', listToSave.associations?.length || 0, 'updatedAt=', listToSave.updatedAt, 'ttsProvider=', listToSave.settings?.ttsProvider, 'voiceTermId=', listToSave.settings?.voiceTermId);

      try {
        await listService.updateList(listToSave.id, {
          name: listToSave.name,
          concept: listToSave.concept,
          associations: listToSave.associations,
          settings: listToSave.settings,
        });
      } catch (error) {
        console.error('[syncToCloud] updateList failed, creating new list:', error);
        try {
          const newId = await listService.createList({
            name: listToSave.name,
            concept: listToSave.concept,
            associations: listToSave.associations,
            settings: listToSave.settings,
            userId: user.uid,
            isArchived: false,
            sourceType: listToSave.sourceType,
            sourceUrl: listToSave.sourceUrl,
            rawSourceText: listToSave.rawSourceText,
            sourceRow: listToSave.sourceRow,
          });
          const freshLists = get().lists;
          const updatedLists = freshLists.map(l => l.id === listId ? { ...l, id: newId } : l);
          set({
            lists: updatedLists,
            ...(get().currentListId === listId
              ? { currentListId: newId, currentList: updatedLists.find(l => l.id === newId) ?? null }
              : {}),
          });
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
          return;
        } catch (createError) {
          console.error('[syncToCloud] createList also failed:', createError);
          console.error('Error al sincronizar la lista. Se guardaron los cambios localmente.');
        }
      }
    })();

    syncToCloudInFlight.set(listId, run);
    run.then(
      () => {
        if (syncToCloudInFlight.get(listId) === run) syncToCloudInFlight.delete(listId);
      },
      (error) => {
        if (syncToCloudInFlight.get(listId) === run) syncToCloudInFlight.delete(listId);
        console.error('[syncToCloud] error:', error);
      },
    );
    return run;
  },
}));
