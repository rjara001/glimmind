import { CardActivityEvent, GameSessionSummary } from '../types/activity';
import { callFunction } from './callFunction';

const LOCAL_ACTIVITY_KEY = 'glimmind_activity';
const LOCAL_SESSIONS_KEY = 'glimmind_sessions';
const LOCAL_MAX_EVENTS = 2000;
const LOCAL_MAX_SESSIONS = 200;

export interface ActivityPage {
  events: CardActivityEvent[];
  nextCursor?: string;
}

export interface ActivityQuery {
  cursor?: string;
  limit?: number;
  type?: CardActivityEvent['type'];
  listId?: string;
}

function loadLocalActivity(): CardActivityEvent[] {
  const saved = localStorage.getItem(LOCAL_ACTIVITY_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalActivity(events: CardActivityEvent[]): void {
  localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(events));
}

function loadLocalSessions(): GameSessionSummary[] {
  const saved = localStorage.getItem(LOCAL_SESSIONS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalSessions(sessions: GameSessionSummary[]): void {
  localStorage.setItem(LOCAL_SESSIONS_KEY, JSON.stringify(sessions));
}

export const activityService = {
  appendEvents: async (userId: string, events: CardActivityEvent[]): Promise<void> => {
    if (events.length === 0) return;
    if (!userId) {
      const merged = [...loadLocalActivity(), ...events]
        .sort((a, b) => b.at - a.at)
        .slice(0, LOCAL_MAX_EVENTS);
      saveLocalActivity(merged);
      return;
    }
    await callFunction('appendActivity', { userId, events });
  },

  fetchActivity: async (userId: string, query: ActivityQuery = {}): Promise<ActivityPage> => {
    const { cursor, limit = 50, type, listId } = query;
    if (!userId) {
      let events = loadLocalActivity();
      if (type) events = events.filter((event) => event.type === type);
      if (listId) events = events.filter((event) => event.listId === listId);
      events.sort((a, b) => b.at - a.at);
      const startIndex = cursor ? events.findIndex((event) => event.id === cursor) + 1 : 0;
      const page = events.slice(startIndex, startIndex + limit);
      const nextCursor =
        page.length === limit && startIndex + limit < events.length
          ? page[page.length - 1].id
          : undefined;
      return { events: page, nextCursor };
    }
    return callFunction<ActivityPage>('getActivity', { userId, cursor, limit, type, listId });
  },

  saveSession: async (userId: string, session: GameSessionSummary): Promise<void> => {
    if (!userId) {
      const sessions = loadLocalSessions();
      sessions.unshift(session);
      saveLocalSessions(sessions.slice(0, LOCAL_MAX_SESSIONS));
      return;
    }
    await callFunction('saveSession', { userId, session });
  },

  fetchSessions: async (userId: string): Promise<GameSessionSummary[]> => {
    if (!userId) return loadLocalSessions();
    return callFunction<GameSessionSummary[]>('getSessions', { userId });
  },
};
