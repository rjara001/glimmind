import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import backendPlans from '../../backend/src/functions/src/config/plans.json';
import frontendPlans from '../../src/config/plans.json';

// The two build pipelines cannot share one plans.json: Firebase only deploys
// backend/src/functions/, and vite.config.ts sets root to src/ so the frontend
// cannot reliably import from backend/. The backend copy is canonical because it
// is the one that enforces limits. This test is what keeps them honest.
describe('plans.json drift', () => {
  const CANONICAL = resolve(__dirname, '../../backend/src/functions/src/config/plans.json');
  const MIRROR = resolve(__dirname, '../../src/config/plans.json');

  it('keeps the frontend copy byte-identical to the canonical backend copy', () => {
    const canonical = readFileSync(CANONICAL, 'utf8');
    const mirror = readFileSync(MIRROR, 'utf8');

    expect(mirror).toBe(canonical);
  });

  it('keeps the mirrored import in sync with the mirrored file', () => {
    expect(frontendPlans).toEqual(JSON.parse(readFileSync(MIRROR, 'utf8')));
    expect(backendPlans).toEqual(JSON.parse(readFileSync(CANONICAL, 'utf8')));
  });

  it('describes exactly two tiers', () => {
    expect(Object.keys(backendPlans.tiers)).toEqual(['free', 'premium']);
  });

  it('gives premium more room than free', () => {
    expect(backendPlans.tiers.premium.maxCards).toBeGreaterThan(backendPlans.tiers.free.maxCards);
    expect(backendPlans.tiers.premium.aiDailyLimit).toBeGreaterThan(
      backendPlans.tiers.free.aiDailyLimit
    );
  });
});