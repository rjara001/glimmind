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

export type QuotaState = 'ok' | 'warning' | 'blocked';

export interface QuotaStatus {
  state: QuotaState;
  used: number;
  quota: number;
  remaining: number;
  percentage: number;
}
