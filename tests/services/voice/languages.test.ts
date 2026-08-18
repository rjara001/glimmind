import { describe, it, expect } from 'vitest';
import { detectLanguage, resolveLanguages, resolveVoiceLanguages } from '@/services/voice/languages';

describe('detectLanguage', () => {
  it('detects English labels', () => {
    expect(detectLanguage('Inglés')).toBe('en');
    expect(detectLanguage('English')).toBe('en');
    expect(detectLanguage('Inglés Americano')).toBe('en');
  });

  it('detects Spanish labels', () => {
    expect(detectLanguage('Español')).toBe('es');
    expect(detectLanguage('Spanish')).toBe('es');
    expect(detectLanguage('Castellano')).toBe('es');
  });

  it('detects other common languages', () => {
    expect(detectLanguage('Francés')).toBe('fr');
    expect(detectLanguage('Deutsch')).toBeNull();
    expect(detectLanguage('Alemán')).toBe('de');
    expect(detectLanguage('Portugués Brasil')).toBe('pt-BR');
    expect(detectLanguage('Italiano')).toBe('it');
  });

  it('returns null for unknown or empty labels', () => {
    expect(detectLanguage('')).toBeNull();
    expect(detectLanguage('Valor 1')).toBeNull();
    expect(detectLanguage('???')).toBeNull();
  });
});

describe('resolveLanguages', () => {
  it('maps term label to tts and definition label to stt in normal order', () => {
    expect(resolveLanguages('Inglés / Español', 'normal')).toEqual({
      ttsLang: 'en',
      sttLang: 'es',
    });
  });

  it('swaps languages when flipped', () => {
    expect(resolveLanguages('Inglés / Español', 'reversed')).toEqual({
      ttsLang: 'es',
      sttLang: 'en',
    });
  });

  it('falls back to the recognised side language when one label is unrecognised', () => {
    expect(resolveLanguages('Valor 1 / Español', 'normal')).toEqual({
      ttsLang: 'es',
      sttLang: 'es',
    });
  });

  it('inherits the recognised side language when the definition is unrecognised (reversed)', () => {
    expect(resolveLanguages('Inglés / Valor 1', 'reversed')).toEqual({
      ttsLang: 'en',
      sttLang: 'en',
    });
  });

  it('uses the default voice language when no label is recognised', () => {
    expect(resolveLanguages('Test1 / Test1', 'normal')).toEqual({
      ttsLang: 'es',
      sttLang: 'es',
    });
  });

  it('uses the default voice language when concept is empty', () => {
    expect(resolveLanguages('', 'normal')).toEqual({
      ttsLang: 'es',
      sttLang: 'es',
    });
  });
});

describe('resolveVoiceLanguages', () => {
  it('prefers explicit overrides over concept labels', () => {
    expect(
      resolveVoiceLanguages('Valor 1 / Valor 2', 'normal', { termLang: 'en', defLang: 'es' }),
    ).toEqual({ ttsLang: 'en', sttLang: 'es' });
  });

  it('swaps overrides when flipped', () => {
    expect(
      resolveVoiceLanguages('Valor 1 / Valor 2', 'reversed', { termLang: 'en', defLang: 'es' }),
    ).toEqual({ ttsLang: 'es', sttLang: 'en' });
  });

  it('falls back to concept labels when no override is given', () => {
    expect(
      resolveVoiceLanguages('Inglés / Español', 'normal', {}),
    ).toEqual({ ttsLang: 'en', sttLang: 'es' });
  });

  it('falls back to the default voice language for opaque concepts without overrides', () => {
    expect(
      resolveVoiceLanguages('Valor 1 / Valor 2', 'normal', {}),
    ).toEqual({ ttsLang: 'es', sttLang: 'es' });
  });

  it('uses a single override and inherits the recognised concept side for the other', () => {
    expect(
      resolveVoiceLanguages('Valor 1 / Español', 'normal', { termLang: 'en' }),
    ).toEqual({ ttsLang: 'en', sttLang: 'es' });
  });

  it('matches resolveLanguages behaviour when called without overrides', () => {
    expect(resolveVoiceLanguages('Inglés / Español', 'reversed')).toEqual(
      resolveLanguages('Inglés / Español', 'reversed'),
    );
  });
});
