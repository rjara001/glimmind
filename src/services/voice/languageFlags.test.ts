import { describe, it, expect } from 'vitest';
import { getLanguageFlag } from './languageFlags';

describe('getLanguageFlag', () => {
  it('returns the correct flag for supported languages', () => {
    expect(getLanguageFlag('es')).toBe('🇪🇸');
    expect(getLanguageFlag('en')).toBe('🇬🇧');
    expect(getLanguageFlag('fr')).toBe('🇫🇷');
    expect(getLanguageFlag('de')).toBe('🇩🇪');
    expect(getLanguageFlag('it')).toBe('🇮🇹');
    expect(getLanguageFlag('pt')).toBe('🇧🇷');
    expect(getLanguageFlag('pt-BR')).toBe('🇧🇷');
    expect(getLanguageFlag('ja')).toBe('🇯🇵');
    expect(getLanguageFlag('ko')).toBe('🇰🇷');
    expect(getLanguageFlag('zh-CN')).toBe('🇨🇳');
    expect(getLanguageFlag('ru')).toBe('🇷🇺');
    expect(getLanguageFlag('ar')).toBe('🇸🇦');
    expect(getLanguageFlag('nl')).toBe('🇳🇱');
    expect(getLanguageFlag('sv')).toBe('🇸🇪');
    expect(getLanguageFlag('pl')).toBe('🇵🇱');
    expect(getLanguageFlag('tr')).toBe('🇹🇷');
    expect(getLanguageFlag('el')).toBe('🇬🇷');
    expect(getLanguageFlag('hi')).toBe('🇮🇳');
    expect(getLanguageFlag('uk')).toBe('🇺🇦');
    expect(getLanguageFlag('vi')).toBe('🇻🇳');
    expect(getLanguageFlag('th')).toBe('🇹🇭');
  });

  it('returns globe for unknown languages', () => {
    expect(getLanguageFlag('xx')).toBe('🌐');
    expect(getLanguageFlag('')).toBe('🌐');
  });

  it('returns globe for null/undefined', () => {
    expect(getLanguageFlag(null)).toBe('🌐');
    expect(getLanguageFlag(undefined)).toBe('🌐');
  });
});
