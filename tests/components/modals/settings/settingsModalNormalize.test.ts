import { describe, it, expect } from 'vitest';
import { normalizeVoiceSettings } from '@/components/modals/SettingsModal';
import type { ListSettings } from '@/types';

describe('normalizeVoiceSettings', () => {
  it('coerces stored cloud providers to browser for a free account', () => {
    const settings = { ttsProvider: 'chirp', sttProvider: 'chiptt' } as ListSettings;

    const result = normalizeVoiceSettings(settings, 'free');

    expect(result.ttsProvider).toBe('browser');
    expect(result.sttProvider).toBe('browser');
  });

  it('coerces stored cloud providers to browser when the tier is unknown, as for a guest', () => {
    const settings = { ttsProvider: 'chirp', sttProvider: 'chiptt' } as ListSettings;

    const result = normalizeVoiceSettings(settings, null);

    expect(result.ttsProvider).toBe('browser');
    expect(result.sttProvider).toBe('browser');
  });

  it('keeps the cloud providers for a premium account', () => {
    const settings = { ttsProvider: 'chirp', sttProvider: 'chiptt' } as ListSettings;

    const result = normalizeVoiceSettings(settings, 'premium');

    expect(result.ttsProvider).toBe('chirp');
    expect(result.sttProvider).toBe('chiptt');
  });

  it('keeps vosk for a free account, because it runs on the device', () => {
    const settings = { ttsProvider: 'browser', sttProvider: 'vosk' } as ListSettings;

    const result = normalizeVoiceSettings(settings, 'free');

    expect(result.ttsProvider).toBe('browser');
    expect(result.sttProvider).toBe('vosk');
  });

  it('does not invent providers that were never set', () => {
    const result = normalizeVoiceSettings({} as ListSettings, 'free');

    expect(result.ttsProvider).toBeUndefined();
    expect(result.sttProvider).toBeUndefined();
  });

  it('drops a stored browser voice id that does not belong to Chirp when chirp stays selected', () => {
    const settings = {
      ttsProvider: 'chirp',
      voiceTermId: 'Google UK English Female',
      voiceDefId: 'CHIRP-3-HD-ES-1',
    } as unknown as ListSettings;

    const result = normalizeVoiceSettings(settings, 'premium');

    expect(result.ttsProvider).toBe('chirp');
    expect(result.voiceTermId).toBeUndefined();
    expect(result.voiceDefId).toBe('CHIRP-3-HD-ES-1');
  });
});
