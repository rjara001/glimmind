import { describe, it, expect } from 'vitest';
import { resolveVoiceForLang, VoiceLike } from './voicePicker';

const voice = (lang: string, overrides: Partial<VoiceLike> = {}): VoiceLike => ({
  lang,
  name: lang,
  default: false,
  localService: true,
  voiceURI: lang,
  ...overrides,
});

describe('resolveVoiceForLang', () => {
  const voices = [
    voice('en-US', { default: true }),
    voice('es-ES'),
    voice('fr-FR'),
  ];

  it('returns the exact language match', () => {
    expect(resolveVoiceForLang('es-ES', voices)?.lang).toBe('es-ES');
  });

  it('matches a base language to the regional prefix voice', () => {
    expect(resolveVoiceForLang('es', voices)?.lang).toBe('es-ES');
  });

  it('returns undefined when no voices are installed', () => {
    expect(resolveVoiceForLang('es', [])).toBeUndefined();
  });

  it('falls back to the default voice when no language matches', () => {
    expect(resolveVoiceForLang('ja', voices)?.lang).toBe('en-US');
  });

  it('falls back to the first voice when no language matches and no default exists', () => {
    const noDefault = voices.map((v) => ({ ...v, default: false }));
    expect(resolveVoiceForLang('ja', noDefault)?.lang).toBe('en-US');
  });

  it('prefers the default voice when lang is null', () => {
    expect(resolveVoiceForLang(null, voices)?.lang).toBe('en-US');
  });

  it('is case-insensitive', () => {
    expect(resolveVoiceForLang('ES-ES', voices)?.lang).toBe('es-ES');
  });

  it('returns the only installed voice when the list has one entry', () => {
    expect(resolveVoiceForLang('es', [voice('en-US')])?.lang).toBe('en-US');
  });
});
