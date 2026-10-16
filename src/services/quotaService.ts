import { QUOTA_CONFIG, TierType, QuotaStatus } from '../constants/quotaConfig';
import { callFunction } from './callFunction';
import { UserQuota } from '../types/quota';
import { GUEST_UID } from '../constants/app';

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

  static async checkQuota(userId: string, projectedCards: number): Promise<QuotaStatus> {
    const userQuota = await quotaService.fetchQuota(userId);
    if (!userQuota) {
      return {
        currentCards: 0,
        maxCards: this.getMaxCards('free'),
        usageRatio: 0,
        percentage: 0,
        level: 'ok',
        isAiBlocked: false,
        isManualBlocked: false,
        remainingCards: this.getMaxCards('free'),
      };
    }
    return this.getStatus(projectedCards, userQuota.tier);
  }
}

export const quotaService = {
  fetchQuota: async (userId: string): Promise<UserQuota | null> => {
    if (!userId || userId === 'anonymous' || userId === GUEST_UID) return null;
    try {
      return await callFunction<UserQuota>('getQuota', { userId });
    } catch (error) {
      console.warn('[quotaService.fetchQuota] Failed to fetch quota:', error);
      return null;
    }
  },

  checkQuota: async (userId: string, projectedCards: number): Promise<QuotaStatus> => {
    return QuotaService.checkQuota(userId, projectedCards);
  },
};

// A missing quota means two different things. For guests (and signed-out
// users) it is expected: they never call getQuota and their tier really is
// free. For an authenticated user it means the fetch failed, so the tier is
// UNKNOWN — manufacturing "free" there blocked paying users at the free
// ceiling whenever getQuota failed (P1 2026-10-12).
export const QUOTA_UNKNOWN_MESSAGE =
  'No pudimos verificar tu plan. Revisa tu conexión e inténtalo de nuevo.';

export function resolveTierForGate(
  quota: UserQuota | null,
  userUid: string | null | undefined,
): { tier: TierType; known: boolean } {
  if (!userUid || userUid === GUEST_UID) return { tier: 'free', known: true };
  if (quota?.tier) return { tier: quota.tier, known: true };
  return { tier: 'free', known: false };
}
