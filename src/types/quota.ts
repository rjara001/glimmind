export type UserTier = 'free' | 'premium';

export interface UserQuota {
  tier: UserTier;
  cardCount: number;
  cardQuota: number;
  aiQuotaDaily: number;
  aiUsedToday: number;
  ytAiUsedToday: number;
  ytAiDailyLimit: number;
  translationCharsUsed: number;
  translationCharLimit: number;
}

export type QuotaLevel = 'ok' | 'warning' | 'danger' | 'blocked';

export type QuotaState = QuotaLevel;

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
