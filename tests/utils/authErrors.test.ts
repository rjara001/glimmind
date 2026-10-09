import { describe, it, expect } from 'vitest';
import {
  describeAuthError,
  isCoopIsolationError,
  isUserCancellation,
  shouldUseRedirectFallback,
} from '@/utils/authErrors';

describe('authErrors', () => {
  describe('isCoopIsolationError', () => {
    it('detects a COOP isolation failure from the message', () => {
      expect(isCoopIsolationError(new Error('Cross-Origin-Opener-Policy: window.closed call'))).toBe(true);
    });

    it('returns false for a regular auth error', () => {
      expect(isCoopIsolationError({ code: 'auth/popup-blocked', message: 'blocked' })).toBe(false);
    });

    it('returns false for null and undefined', () => {
      expect(isCoopIsolationError(null)).toBe(false);
      expect(isCoopIsolationError(undefined)).toBe(false);
    });
  });

  describe('shouldUseRedirectFallback', () => {
    it.each([
      'auth/popup-blocked',
      'auth/cancelled-popup-request',
      'auth/web-storage-unsupported',
    ])('returns true for %s', (code) => {
      expect(shouldUseRedirectFallback({ code })).toBe(true);
    });

    it('returns false for a COOP failure, which redirect cannot fix', () => {
      expect(
        shouldUseRedirectFallback(new Error('Cross-Origin-Opener-Policy: window.closed'))
      ).toBe(false);
    });

    it('returns false when there is no code', () => {
      expect(shouldUseRedirectFallback(new Error('boom'))).toBe(false);
      expect(shouldUseRedirectFallback(null)).toBe(false);
    });
  });

  describe('isUserCancellation', () => {
    it('detects a user-closed popup', () => {
      expect(isUserCancellation({ code: 'auth/popup-closed-by-user' })).toBe(true);
    });

    it('returns false for other codes', () => {
      expect(isUserCancellation({ code: 'auth/popup-blocked' })).toBe(false);
    });
  });

  describe('describeAuthError', () => {
    it('never surfaces the raw Unauthorized string for COOP failures', () => {
      const message = describeAuthError(new Error('Cross-Origin-Opener-Policy: window.closed'));
      expect(message).toMatch(/no disponible en este navegador/i);
      expect(message).not.toMatch(/unauthorized/i);
    });

    it('maps known auth codes to a Spanish message', () => {
      expect(describeAuthError({ code: 'auth/unauthorized-domain' })).toBe(
        'Dominio no autorizado para iniciar sesión.'
      );
      expect(describeAuthError({ code: 'auth/network-request-failed' })).toBe(
        'Error de red. Revisá tu conexión.'
      );
    });

    it('includes the code for unknown auth errors so they stay diagnosable', () => {
      const message = describeAuthError({ code: 'auth/some-future-code' });
      expect(message).toContain('auth/some-future-code');
    });

    it('falls back to a generic message with no code', () => {
      expect(describeAuthError(new Error('boom'))).toBe('No pudimos iniciar sesión. Intentá de nuevo.');
    });

    it('handles null', () => {
      expect(describeAuthError(null)).toBe('No pudimos iniciar sesión. Intentá de nuevo.');
    });
  });
});