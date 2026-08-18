import { UserSettings, DEFAULT_SETTINGS } from '../types/settings';
import { callFunction } from './callFunction';

const LOCAL_SETTINGS_KEY = 'glimmind_settings';

export const settingsService = {
  fetchSettings: async (userId: string): Promise<UserSettings | null> => {
    if (!userId) return null;
    try {
      return await callFunction<UserSettings | null>('getSettings', { userId });
    } catch (error) {
      return null;
    }
  },

  saveSettings: async (userId: string, settings: UserSettings): Promise<void> => {
    await callFunction('updateSettings', { userId, settings });
  },

  loadLocalSettings: (): UserSettings => {
    const saved = localStorage.getItem(LOCAL_SETTINGS_KEY);
    if (!saved) return { ...DEFAULT_SETTINGS };
    try {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  saveLocalSettings: (settings: UserSettings): void => {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify(settings));
  },
};
