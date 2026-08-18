import { describe, it, expect } from 'vitest';
import { computeQuotaStatus, countCards } from '@/utils/quota';

describe('computeQuotaStatus', () => {
  it('returns ok state when far below quota', () => {
    const status = computeQuotaStatus(500, 1000);
    expect(status.state).toBe('ok');
    expect(status.used).toBe(500);
    expect(status.quota).toBe(1000);
    expect(status.remaining).toBe(500);
    expect(status.percentage).toBe(50);
  });

  it('returns warning state at or above 90%', () => {
    const status = computeQuotaStatus(900, 1000);
    expect(status.state).toBe('warning');
    expect(status.remaining).toBe(100);
  });

  it('returns blocked state at 100%', () => {
    const status = computeQuotaStatus(1000, 1000);
    expect(status.state).toBe('blocked');
    expect(status.remaining).toBe(0);
  });

  it('returns blocked state above quota', () => {
    const status = computeQuotaStatus(1200, 1000);
    expect(status.state).toBe('blocked');
    expect(status.percentage).toBe(120);
    expect(status.remaining).toBe(0);
  });

  it('clamps quota to at least 1 to avoid division by zero', () => {
    const status = computeQuotaStatus(5, 0);
    expect(status.quota).toBe(1);
    expect(status.remaining).toBe(0);
  });

  it('clamps negative used to zero', () => {
    const status = computeQuotaStatus(-10, 1000);
    expect(status.used).toBe(0);
    expect(status.state).toBe('ok');
  });
});

describe('countCards', () => {
  it('counts all associations including archived cards', () => {
    const lists = [
      { associations: [{ isArchived: false }, { isArchived: true }] },
      { associations: [{ isArchived: false }] },
    ];
    expect(countCards(lists)).toBe(3);
  });

  it('handles lists without associations', () => {
    expect(countCards([{ associations: [] }, {}])).toBe(0);
  });
});
