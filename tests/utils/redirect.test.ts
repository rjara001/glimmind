import { describe, it, expect } from 'vitest';
import { resolveNextPath, NEXT_PATH_QUERY } from '@/utils/redirect';

describe('resolveNextPath', () => {
  it('exposes the query key used by the login route', () => {
    expect(NEXT_PATH_QUERY).toBe('next');
  });

  it('accepts an internal path', () => {
    expect(resolveNextPath('/settings')).toBe('/settings');
  });

  it('accepts a nested internal path', () => {
    expect(resolveNextPath('/settings/premium')).toBe('/settings/premium');
  });

  it('falls back when the param is missing', () => {
    expect(resolveNextPath(null)).toBe('/dashboard');
    expect(resolveNextPath(undefined)).toBe('/dashboard');
    expect(resolveNextPath('')).toBe('/dashboard');
  });

  describe('rejects external targets', () => {
    const externalTargets = [
      'https://evil.com',
      'http://evil.com',
      '//evil.com',
      '//evil.com/settings',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'settings',
      '/\\evil.com',
      '\\\\evil.com',
    ];

    it.each(externalTargets)('falls back to the dashboard for %s', (target) => {
      expect(resolveNextPath(target)).toBe('/dashboard');
    });
  });

  it('uses the provided fallback', () => {
    expect(resolveNextPath('https://evil.com', '/login')).toBe('/login');
  });
});