export const QUOTA_CONFIG = {
  tiers: {
    free: {
      maxCards: 1000,
      aiDailyLimit: 100,
    },
    premium: {
      maxCards: 5000,
      aiDailyLimit: 1000,
    },
  },
  thresholds: {
    warningRatio: 0.80,
    dangerRatio: 0.95,
    blockRatio: 1.00,
  },
  maxCardsPerList: 5000,
} as const;

export type TierType = 'free' | 'premium';

export type QuotaLevel = 'ok' | 'warning' | 'danger' | 'blocked';

export interface QuotaStatus {
  currentCards: number;
  maxCards: number;
  usageRatio: number;
  percentage: number;
  level: QuotaLevel;
  isAiBlocked: boolean;
  isManualBlocked: boolean;
  remainingCards: number;
}
