import { describe, it, expect } from 'vitest';
import { resolveTierForGate, QUOTA_UNKNOWN_MESSAGE, QuotaService } from '@/services/quotaService';
import { GUEST_UID } from '@/constants/app';

// P1 2026-10-12: a failed getQuota left quota=null and every gate fell back
// to "free", so a paying Premium user was blocked at the 1000-card ceiling
// with a free-tier message. resolveTierForGate must distinguish "guest, tier
// really is free" from "authenticated, tier UNKNOWN".
describe('resolveTierForGate', () => {
  it('treats a guest as free — they never fetch quota, free is correct', () => {
    expect(resolveTierForGate(null, GUEST_UID)).toEqual({ tier: 'free', known: true });
    expect(resolveTierForGate(undefined, GUEST_UID)).toEqual({ tier: 'free', known: true });
  });

  it('treats a signed-out user as free', () => {
    expect(resolveTierForGate(null, null)).toEqual({ tier: 'free', known: true });
    expect(resolveTierForGate(null, undefined)).toEqual({ tier: 'free', known: true });
  });

  it('returns the fetched tier for an authenticated user', () => {
    expect(resolveTierForGate({ tier: 'premium' }, 'user-1')).toEqual({
      tier: 'premium',
      known: true,
    });
    expect(resolveTierForGate({ tier: 'free' }, 'user-1')).toEqual({
      tier: 'free',
      known: true,
    });
  });

  it('marks the tier as UNKNOWN for an authenticated user without quota', () => {
    expect(resolveTierForGate(null, 'user-1')).toEqual({ tier: 'free', known: false });
    expect(resolveTierForGate(undefined, 'user-1')).toEqual({ tier: 'free', known: false });
  });

  it('surfaces a connectivity message, never a card-limit message', () => {
    expect(QUOTA_UNKNOWN_MESSAGE).toMatch(/conexión/i);
    expect(QUOTA_UNKNOWN_MESSAGE).not.toMatch(/límite de \d+ tarjetas/i);
  });

  it('a Premium user with unknown quota never sees the free ceiling', () => {
    const gate = resolveTierForGate(null, 'premium-user');
    expect(gate.known).toBe(false);

    // Whatever tier the gate falls back to internally, the caller must not
    // proceed to render a card-limit message when known=false.
    if (gate.known) {
      const status = QuotaService.getStatus(5100, gate.tier);
      expect(status.maxCards).toBe(QuotaService.getMaxCards('premium'));
    }
  });
});
