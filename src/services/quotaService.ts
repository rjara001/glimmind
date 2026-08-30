import { QUOTA_CONFIG, TierType, QuotaStatus } from '../constants/quotaConfig';
import { callFunction } from './callFunction';
import { UserQuota } from '../types/quota';

export class QuotaService {
  static getMaxCards(tier: TierType = 'free'): number {
    return QUOTA_CONFIG.tiers[tier]?.maxCards ?? QUOTA_CONFIG.tiers.free.maxCards;
  }

  static getAiDailyLimit(tier: TierType = 'free'): number {
    return QUOTA_CONFIG.tiers[tier]?.aiDailyLimit ?? QUOTA_CONFIG.tiers.free.aiDailyLimit;
  }

  static getStatus(currentCards: number, tier: TierType = 'free'): QuotaStatus {
    const maxCards = this.getMaxCards(tier);
    const usageRatio = currentCards / maxCards;

    let level: 'ok' | 'warning' | 'danger' | 'blocked' = 'ok';
    if (usageRatio >= QUOTA_CONFIG.thresholds.blockRatio) {
      level = 'blocked';
    } else if (usageRatio >= QUOTA_CONFIG.thresholds.dangerRatio) {
      level = 'danger';
    } else if (usageRatio >= QUOTA_CONFIG.thresholds.warningRatio) {
      level = 'warning';
    }

    return {
      currentCards,
      maxCards,
      usageRatio,
      percentage: Math.round(usageRatio * 100),
      level,
      isAiBlocked: level === 'danger' || level === 'blocked',
      isManualBlocked: level === 'blocked',
      remainingCards: Math.max(0, maxCards - currentCards),
    };
  }

  static canAddCards(currentCards: number, cardsToAdd: number, tier: TierType = 'free'): boolean {
    const maxCards = this.getMaxCards(tier);
    return (currentCards + cardsToAdd) <= maxCards;
  }

  static canUseAI(currentCards: number, tier: TierType = 'free'): boolean {
    const status = this.getStatus(currentCards, tier);
    return !status.isAiBlocked;
  }

  static getEffectiveQuota(currentCards: number, tier: TierType = 'free'): number {
    const maxCards = this.getMaxCards(tier);
    if (tier === 'free' && currentCards > maxCards) {
      return Math.max(maxCards, currentCards);
    }
    return maxCards;
  }
}

export const quotaService = {
  fetchQuota: async (userId: string): Promise<UserQuota | null> => {
    if (!userId) return null;
    try {
      return await callFunction<UserQuota>('getQuota', { userId });
    } catch (error) {
      return null;
    }
  },
};
