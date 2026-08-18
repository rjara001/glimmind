import { describe, it, expect, beforeEach } from 'vitest';
import { settingsService } from '@/services/settingsService';
import { DEFAULT_SETTINGS } from '@/types/settings';

const LOCAL_SETTINGS_KEY = 'glimmind_settings';

describe('settingsService local storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default settings when nothing is saved', () => {
    expect(settingsService.loadLocalSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips saved settings', () => {
    const settings = { activityHistoryEnabled: true, audioRecordingEnabled: false };
    settingsService.saveLocalSettings(settings);
    expect(settingsService.loadLocalSettings()).toEqual({ ...settings, voiceSttFallback: false });
  });

  it('merges partial saved settings with defaults', () => {
    localStorage.setItem(LOCAL_SETTINGS_KEY, JSON.stringify({ activityHistoryEnabled: true }));
    expect(settingsService.loadLocalSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      activityHistoryEnabled: true,
    });
  });

  it('falls back to defaults on corrupted JSON', () => {
    localStorage.setItem(LOCAL_SETTINGS_KEY, '{not valid json');
    expect(settingsService.loadLocalSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
