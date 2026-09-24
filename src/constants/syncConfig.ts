export const SYNC_CONFIG = {
  periodicIntervalMs: {
    free: 5 * 60 * 1000,
    premium: 2 * 60 * 1000,
  },
  maxDeltasPerBatch: {
    free: 50,
    premium: 200,
  },
  retry: {
    maxAttempts: { free: 2, premium: 3 },
    baseDelayMs: 1000,
    maxDelayMs: 10000,
  },
  keepaliveMaxBytes: 64 * 1024,
  keepaliveSafeLimit: 50 * 1024,
  maxConflictRetries: 2,
} as const;

export type TierType = 'free' | 'premium';

export function getPeriodicIntervalMs(tier: TierType): number {
  return SYNC_CONFIG.periodicIntervalMs[tier];
}

export function getMaxDeltasPerBatch(tier: TierType): number {
  return SYNC_CONFIG.maxDeltasPerBatch[tier];
}

export function getMaxRetryAttempts(tier: TierType): number {
  return SYNC_CONFIG.retry.maxAttempts[tier];
}

export function getRetryConfig() {
  return SYNC_CONFIG.retry;
}