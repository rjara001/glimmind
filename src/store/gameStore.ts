import { create } from 'zustand';
import { AssociationList, Association, AppUser, GameState } from '../types';
import { listService } from '../services/firestoreService';
import { quotaService } from '../services/quotaService';
import { isUsingEmulators, auth } from '../firebase';
import { normalizeAssociations } from '../utils/normalizeAssociation';
import { backfillAssociationStats, buildListDiffEvents } from '../utils/activity';
import {
  applyRepaso,
  computeStateBreakdown,
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
  ACTIVITY_SAVE_DEBOUNCE_MS,
  LIST_CACHE_TTL_MS,
  LAST_CLOUD_FETCH_KEY,
} from '../constants/limits';
import { GUEST_UID } from '../constants/app';
import { normalizeVoiceLanguageSettings } from '../services/voice/languages';
import { computeDelta, AssociationDelta, chunkDeltas, mergeCloudWins } from '../utils/syncDelta';
import { SYNC_CONFIG } from '../constants/syncConfig';

const LOCAL_STORAGE_KEY = 'glimmind_lists';
const LOCAL_STORAGE_BACKUP_KEY = 'glimmind_lists_backup';
const LOCAL_PROGRESS_KEY = 'glimmind_progress';
const CACHE_ENV_KEY = 'glimmind_cache_env';
const LOCAL_LAST_PLAYED_KEY = 'glimmind_last_played';
const PENDING_DELTAS_KEY = 'glimmind_pending_deltas';

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
    flushActivityCloudSave(); // Solo mantenemos activity
  };
  window.addEventListener('beforeunload', handleFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
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
      byId.set(assoc.id, assoc);
    }
  }
  return Array.from(byId.values());
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
    const preferLocal = localTime === 0 || localTime >= cloudTime;
    if (preferLocal) {
      byId.set(assoc.id, assoc);
    }
  }
  return Array.from(byId.values());
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

    const mergedAssociations = mergeAssociationsPreferLocal(localList.associations || [], cloudList.associations || []);
    const localTime = getListTimestamp(localList);
    const cloudTime = getListTimestamp(cloudList);
    
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

interface ResumeSnapshot {
  state: GameState;
  sessionRepasos: number;
}

interface AuditReportEntry {
  listId: string;
  nombre: string;
  estadoCuadre: '✅ CALZA' | '❌ DESCUADRADO';
  tarjetas: string;
  aprendidas: string;
  repasos: string;
  completado: string;
  ultimoLocal: string;
  ultimoCloud: string;
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
  
  // Sync State
  pendingDeltas: Map<string, AssociationDelta[]>;
  lastSyncedAt: Map<string, number>;
  syncInProgress: Set<string>;
  syncMetrics: SyncMetrics;
  
  // Computed
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
  syncToCloud: (listId: string, associations?: Association[]) => Promise<void>;
  addPendingDelta: (listId: string, deltas: AssociationDelta[]) => void;
  flushSync: (listId: string, options?: FlushSyncOptions) => Promise<void>;
  flushAllPendingSyncs: (options?: { keepalive: boolean }) => Promise<void>;
  getSyncMetrics: () => SyncMetrics;

  // Actions - Audit
  auditAndReconcile: (listId?: string) => Promise<AuditReportEntry[]>;
}

interface SyncMetrics {
  sessionEndSyncs: number;
  periodicSyncs: number;
  manualSyncs: number;
  failedSyncs: number;
  conflictsResolved: number;
  avgDeltasPerSync: number;
  avgPayloadBytes: number;
  lastSyncLatencyMs: number;
}

interface FlushSyncOptions {
  keepalive?: boolean;
  deltas?: AssociationDelta[];
  baseUpdatedAt?: number;
  conflictRetryCount?: number;
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
  
  // Sync State
  pendingDeltas: new Map(),
  lastSyncedAt: new Map(),
  syncInProgress: new Set(),
  syncMetrics: {
    sessionEndSyncs: 0,
    periodicSyncs: 0,
    manualSyncs: 0,
    failedSyncs: 0,
    conflictsResolved: 0,
    avgDeltasPerSync: 0,
    avgPayloadBytes: 0,
    lastSyncLatencyMs: 0,
  },
  
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

    if (user && user.uid === GUEST_UID) {
      localStorage.setItem('glimmind_guest_user', JSON.stringify(user));
    } else if (!user) {
      localStorage.removeItem('glimmind_guest_user');
    }

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
    const normalizedLists = withNormalizedVoiceLanguages(lists);
    set({ lists: normalizedLists });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedLists));
  },
  
  updateAssociations: (listId, associations) => {
    const { lists, user } = get();
    const prevList = lists.find(l => l.id === listId);
    if (prevList && user) {
      const events = buildListDiffEvents({
        userId: user.uid,
        listId,
        before: prevList.associations || [],
        after: associations,
      });
      if (events.length > 0) {
        get().recordActivity(events);
      }
      
      // Capture deltas for sync
      const deltas = computeDelta(prevList.associations || [], associations);
      if (deltas.length > 0) {
        get().addPendingDelta(listId, deltas);
      }
    }
    const updatedLists = lists.map(l =>
      l.id === listId ? { ...l, associations, updatedAt: Date.now() } : l
    );
    set({
      lists: updatedLists,
      currentList: updatedLists.find(l => l.id === listId) || null
    });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedLists));
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

    const savedLocal = localStorage.getItem(LOCAL_PROGRESS_KEY);
    const localProgress: UserProgress | null = savedLocal ? JSON.parse(savedLocal) : null;
    const progress = localProgress || createDefaultProgress();
    set({ progress });
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));
    if (localProgress === null) {
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
    const state = get();
    const progress = state.progress || createDefaultProgress();
    const result = applyRepaso(progress, association, listContext, todayKey());
    if (!result) return;

    if (listContext?.listId) {
      const updatedLists = state.lists.map((l) => {
        if (l.id !== listContext.listId) return l;
        return {
          ...l,
          updatedAt: Date.now(),
          associations: (l.associations || []).map((a) =>
            a.id === association.id ? { ...a, ...association } : a
          ),
        };
      });

      const updatedList = updatedLists.find(l => l.id === listContext.listId);
      const updatedAssociations = updatedList?.associations || [];

      set({
        lists: updatedLists,
        progress: result.progress,
        celebration: result.celebration || state.celebration,
      });

      // Sincronizar hacia Firestore leyendo las tarjetas ya mutadas
      get().syncToCloud(listContext.listId, updatedAssociations).catch((err) =>
        console.error('[recordRepaso] syncToCloud failed:', err)
      );
    } else {
      set({
        progress: result.progress,
        celebration: result.celebration || state.celebration,
      });
    }
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
    const { lists } = get();
    const today = todayKey();
    
    const allAssociations = lists.flatMap(l => l.associations || []);
    const globalBreakdown = computeStateBreakdown(allAssociations);
    
    const progressToSave: UserProgress & { updatedAt: number } = {
      ...progress,
      updatedAt: Date.now(),
      log: {
        ...progress.log,
        [today]: {
          ...(progress.log[today] || { repasos: 0, byState: { nuevas: 0, vistas: 0, reconocidas: 0, conocidas: 0, aprendidas: 0 } }),
          byState: globalBreakdown,
        },
      },
    };
    
    // Guardar únicamente en almacenamiento local (caché/UI)
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progressToSave));
  },
  
  // Initialization
  loadInitialData: async () => {
    const { user } = get();
    const requestId = ++syncRequestSequence;
    set({ isLoading: true });

    set({ lists: [] });

    ensureCacheMatchesEnvironment();

    // Load persisted pending deltas
    const savedDeltas = localStorage.getItem(PENDING_DELTAS_KEY);
    if (savedDeltas) {
      try {
        const parsed = JSON.parse(savedDeltas);
        const pendingDeltasMap = new Map<string, AssociationDelta[]>();
        Object.entries(parsed).forEach(([listId, deltas]) => {
          pendingDeltasMap.set(listId, deltas as AssociationDelta[]);
        });
        set({ pendingDeltas: pendingDeltasMap });
      } catch (e) {
        console.error('Error loading pending deltas:', e);
      }
    }

    const isGuest = !user || user.uid === GUEST_UID;

    const savedLists = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (savedLists) {
      try {
        const parsed = JSON.parse(savedLists);
        const { lists: flattenedParsed } = applyFlattening(parsed);
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

    if (!isGuest) {
      if (savedLists && !shouldFetchCloudLists(user.uid)) {
        // Cache is fresh
      } else {
        try {
          backupLocalLists();
          const cloudLists = await listService.fetchListsByUser(user.uid);
          if (requestId !== syncRequestSequence) {
            return;
          }
          markCloudFetch(user.uid);
          const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
          const currentLocalLists = get().lists;
          
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

          try {
            const [cloudQuotaResult, cloudSettingsResult] = await Promise.allSettled([
              quotaService.fetchQuota(user.uid),
              settingsService.fetchSettings(user.uid),
            ]);

            // Progress is loaded from localStorage only (no progressService)
            const localProgressRaw = localStorage.getItem(LOCAL_PROGRESS_KEY);
            const localProgress = localProgressRaw ? JSON.parse(localProgressRaw) as UserProgress & { updatedAt?: number } : null;
            const progress = localProgress || createDefaultProgress();
            set({ progress });
            localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(progress));

            if (cloudQuotaResult.status === 'fulfilled' && cloudQuotaResult.value) {
              set({ quota: cloudQuotaResult.value });
            } else if (cloudQuotaResult.status === 'rejected') {
              console.warn('[loadInitialData] Failed to fetch cloud quota:', cloudQuotaResult.reason);
            }

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
                if (localUpdatedAt > cloudUpdatedAt && user.uid !== GUEST_UID) {
                  settingsService.saveSettings(user.uid, settingsToSave).catch((error) => {
                    console.error('Error saving settings:', error);
                  });
                }
              }
            } else if (cloudSettingsResult.status === 'rejected') {
              console.warn('[loadInitialData] Failed to fetch cloud settings:', cloudSettingsResult.reason);
            }
          } catch (e) {
            console.error('Error fetching additional cloud data:', e);
          }
        } catch (e) {
          console.error('Error fetching cloud lists:', e);
          const restored = restoreLocalListsFromBackup();
          if (restored) {
            set({ lists: restored });
          }
        }
      }
    }
  },

  // Persistence
  syncFromCloud: async () => {
    const { user, lists: localLists } = get();
    if (!user || user.uid === GUEST_UID) return;

    try {
      backupLocalLists();
      const cloudLists = await listService.fetchListsByUser(user.uid);
      markCloudFetch(user.uid);
      const { lists: flattenedCloud, changedIds } = applyFlattening(cloudLists);
      const merged = mergeCloudWithLocalPreferLocal(flattenedCloud, localLists, user.uid);
      const normalizedMerged = withNormalizedVoiceLanguages(merged);

      set({ lists: normalizedMerged });
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizedMerged));

      if (changedIds.length > 0) {
        changedIds.forEach((listId) => {
          get().flushSync(listId).catch((error) => {
            console.error('[syncFromCloud] flushSync failed:', error);
          });
        });
      }
    } catch (e) {
      console.error('Error in syncFromCloud:', e);
    }
  },

  addPendingDelta: (listId, deltas) => {
    const { pendingDeltas } = get();
    const existing = pendingDeltas.get(listId) || [];
    const merged = [...existing, ...deltas];
    
    // Deduplicate by id, keeping the latest
    const byId = new Map<string, AssociationDelta>();
    for (const delta of merged) {
      const existingDelta = byId.get(delta.id);
      if (!existingDelta || delta.updatedAt > existingDelta.updatedAt) {
        byId.set(delta.id, delta);
      }
    }
    
    const newPendingDeltas = new Map(pendingDeltas);
    newPendingDeltas.set(listId, Array.from(byId.values()));
    
    set({ pendingDeltas: newPendingDeltas });
    
    // Persist to localStorage
    const obj = Object.fromEntries(newPendingDeltas);
    localStorage.setItem(PENDING_DELTAS_KEY, JSON.stringify(obj));
  },

  flushSync: async (listId, options = {}) => {
    const { user, pendingDeltas, lastSyncedAt, syncMetrics, lists } = get();
    const { keepalive = false, deltas: providedDeltas, baseUpdatedAt, conflictRetryCount = 0 } = options as FlushSyncOptions;
    
    if (!user || user.uid === GUEST_UID) return;
    
    const syncInProgress = get().syncInProgress;
    if (syncInProgress.has(listId)) return;
    
    const deltasToSync = providedDeltas ?? (pendingDeltas.get(listId) || []);
    if (deltasToSync.length === 0) return;
    
    const list = lists.find(l => l.id === listId);
    if (!list) return;
    
    const baseTs = baseUpdatedAt ?? list.updatedAt ?? Date.now();
    
    // Mark as in progress
    const newSyncInProgress = new Set(syncInProgress);
    newSyncInProgress.add(listId);
    set({ syncInProgress: newSyncInProgress });
    
    const startTime = Date.now();
    
    try {
      // Handle chunking for keepalive
      if (keepalive) {
        const chunks = chunkDeltas(deltasToSync, SYNC_CONFIG.keepaliveSafeLimit);
        for (const chunk of chunks) {
          await listService.updateListFields(listId, baseTs, chunk);
        }
      } else {
        await listService.updateListFields(listId, baseTs, deltasToSync);
      }
      
      // Success - clear pending deltas for this list
      const newPendingDeltas = new Map(pendingDeltas);
      newPendingDeltas.delete(listId);
      
      const newLastSyncedAt = new Map(lastSyncedAt);
      newLastSyncedAt.set(listId, Date.now());
      
      // Update metrics
      const latencyMs = Date.now() - startTime;
      const totalSyncs = syncMetrics.sessionEndSyncs + syncMetrics.periodicSyncs + syncMetrics.manualSyncs;
      const newAvgDeltas = totalSyncs > 0 
        ? (syncMetrics.avgDeltasPerSync * totalSyncs + deltasToSync.length) / (totalSyncs + 1)
        : deltasToSync.length;
      const payloadBytes = JSON.stringify({ listId, baseUpdatedAt: baseTs, deltas: deltasToSync }).length;
      const newAvgPayload = totalSyncs > 0
        ? (syncMetrics.avgPayloadBytes * totalSyncs + payloadBytes) / (totalSyncs + 1)
        : payloadBytes;
      
      set({
        pendingDeltas: newPendingDeltas,
        lastSyncedAt: newLastSyncedAt,
        syncInProgress: new Set([...newSyncInProgress].filter(id => id !== listId)),
        syncMetrics: {
          ...syncMetrics,
          ...(keepalive ? { sessionEndSyncs: syncMetrics.sessionEndSyncs + 1 } : { periodicSyncs: syncMetrics.periodicSyncs + 1 }),
          conflictsResolved: syncMetrics.conflictsResolved,
          avgDeltasPerSync: newAvgDeltas,
          avgPayloadBytes: newAvgPayload,
          lastSyncLatencyMs: latencyMs,
        },
      });
      
      // Persist cleared state
      const obj = Object.fromEntries(newPendingDeltas);
      localStorage.setItem(PENDING_DELTAS_KEY, JSON.stringify(obj));
      
    } catch (error: any) {
      // Handle conflict (409/aborted) with retry guard
      if (error.code === 'aborted' && conflictRetryCount < SYNC_CONFIG.maxConflictRetries) {
        console.log(`[flushSync] Conflict detected for ${listId}, retry ${conflictRetryCount + 1}/${SYNC_CONFIG.maxConflictRetries}`);
        
        // Re-fetch cloud list and merge (LWW)
        try {
          const cloudList = await listService.getList(listId);
          const localList = lists.find(l => l.id === listId);
          if (localList && cloudList) {
            const merged = mergeCloudWins({ associations: localList.associations }, { associations: cloudList.associations });
            const currentLocalAssociations = get().lists.find(l => l.id === listId)?.associations || [];
            const newDeltas = computeDelta(merged.associations || [], currentLocalAssociations);
            
            // Retry with incremented counter
            await get().flushSync(listId, {
              ...options,
              deltas: newDeltas,
              baseUpdatedAt: cloudList.updatedAt ?? Date.now(),
              conflictRetryCount: conflictRetryCount + 1,
            });
            
            // Update conflict metric
            set({
              syncMetrics: {
                ...get().syncMetrics,
                conflictsResolved: get().syncMetrics.conflictsResolved + 1,
              },
            });
            return;
          }
        } catch (e) {
          console.error('[flushSync] Conflict resolution failed:', e);
        }
      }
      
      // Update failed metric
      set({
        syncInProgress: new Set([...newSyncInProgress].filter(id => id !== listId)),
        syncMetrics: {
          ...syncMetrics,
          failedSyncs: syncMetrics.failedSyncs + 1,
        },
      });
      
      console.error(`[flushSync] ${listId}: ❌ error:`, error);
      
      // Don't clear pendingDeltas on failure - they'll be retried
    }
  },

  flushAllPendingSyncs: async (options: { keepalive?: boolean } = {}) => {
    const { pendingDeltas } = get();
    const { keepalive = false } = options;
    
    const listIds = Array.from(pendingDeltas.keys());
    if (listIds.length === 0) return;
    
    // Update sessionEndSyncs metric
    const { syncMetrics } = get();
    set({
      syncMetrics: {
        ...syncMetrics,
        sessionEndSyncs: syncMetrics.sessionEndSyncs + 1,
      },
    });
    
    // Flush all lists with keepalive
    await Promise.allSettled(
      listIds.map(listId => get().flushSync(listId, { keepalive }))
    );
  },

  getSyncMetrics: () => {
    return get().syncMetrics;
  },
  
  syncToCloud: async (listId: string, associations?: Association[]) => {
    // Legacy method - now uses flushSync internally
    if (associations) {
      const { lists } = get();
      const baseList = lists.find(l => l.id === listId);
      if (baseList) {
        const deltas = computeDelta(baseList.associations || [], associations);
        if (deltas.length > 0) {
          await get().flushSync(listId, { deltas });
        }
      }
    } else {
      await get().flushSync(listId);
    }
  },

  // Audit
  auditAndReconcile: async (listId) => {
    const { lists, user } = get();
    const reports: AuditReportEntry[] = [];
    const targetLists = listId ? lists.filter((l) => l.id === listId) : lists;

    for (const list of targetLists) {
      let cloudList: AssociationList | null = null;
      if (user && user.uid !== GUEST_UID) {
        try {
          cloudList = await listService.getList(list.id);
        } catch (e) {
          console.error(`Audit fetch failed for list ${list.id}:`, e);
        }
      }

      const totalCards = list.associations?.length || 0;
      const learnedCards = list.associations?.filter((a) => a.isLearned && !a.isArchived).length || 0;
      const totalRepasos = list.associations?.reduce((acc, a) => acc + (a.hits || 0) + (a.misses || 0), 0) || 0;

      const cloudCards = cloudList?.associations?.length || 0;
      const cloudLearned = cloudList?.associations?.filter((a) => a.isLearned && !a.isArchived).length || 0;

      const calza = totalCards === cloudCards && learnedCards === cloudLearned;

      reports.push({
        listId: list.id,
        nombre: list.name || list.concept || 'Sin título',
        estadoCuadre: calza ? '✅ CALZA' : '❌ DESCUADRADO',
        tarjetas: `${totalCards} (Cloud: ${cloudCards})`,
        aprendidas: `${learnedCards} (Cloud: ${cloudLearned})`,
        repasos: `${totalRepasos}`,
        completado: list.history?.completedAt ? 'Sí' : 'No',
        ultimoLocal: new Date(getListTimestamp(list)).toLocaleString(),
        ultimoCloud: cloudList ? new Date(getListTimestamp(cloudList)).toLocaleString() : 'N/A',
      });
    }

    return reports;
  },
}));

if (typeof window !== 'undefined') {
  (window as any).__GLIMMIND_AUDIT__ = async (listId?: string) => {
    const report = await useGameStore.getState().auditAndReconcile(listId);
    console.table(report);
    return report;
  };
}