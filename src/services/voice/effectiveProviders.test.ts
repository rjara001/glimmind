import { describe, it, expect } from 'vitest';
import { resolveEffectiveSttProvider, resolveEffectiveTtsProvider } from './effectiveProviders';

describe('resolveEffectiveTtsProvider', () => {
  it('returns the browser provider when nothing is stored', () => {
    expect(resolveEffectiveTtsProvider(undefined, 'premium')).toBe('browser');
  });

  it('keeps the browser provider for a free account', () => {
    expect(resolveEffectiveTtsProvider('browser', 'free')).toBe('browser');
  });

  it('coerces chirp to browser for a free account', () => {
    expect(resolveEffectiveTtsProvider('chirp', 'free')).toBe('browser');
  });

  it('coerces chirp to browser when the tier is unknown, as for a guest', () => {
    expect(resolveEffectiveTtsProvider('chirp', null)).toBe('browser');
    expect(resolveEffectiveTtsProvider('chirp', undefined)).toBe('browser');
  });

  it('keeps chirp for a premium account', () => {
    expect(resolveEffectiveTtsProvider('chirp', 'premium')).toBe('chirp');
  });
});

describe('resolveEffectiveSttProvider', () => {
  it('returns the browser provider when nothing is stored', () => {
    expect(resolveEffectiveSttProvider(undefined, 'free')).toBe('browser');
  });

  it('keeps vosk for a free account, because it runs on the device', () => {
    expect(resolveEffectiveSttProvider('vosk', 'free')).toBe('vosk');
  });

  it('coerces chiptt to browser for a free account', () => {
    expect(resolveEffectiveSttProvider('chiptt', 'free')).toBe('browser');
  });

  it('coerces chiptt to browser when the tier is unknown, as for a guest', () => {
    expect(resolveEffectiveSttProvider('chiptt', null)).toBe('browser');
    expect(resolveEffectiveSttProvider('chiptt', undefined)).toBe('browser');
  });

  it('keeps chiptt for a premium account', () => {
    expect(resolveEffectiveSttProvider('chiptt', 'premium')).toBe('chiptt');
  });
});
