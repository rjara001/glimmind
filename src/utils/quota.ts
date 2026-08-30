import { QuotaService } from '../services/quotaService';

interface LegacyQuotaStatus {
  state: 'ok' | 'warning' | 'danger' | 'blocked';
  used: number;
  quota: number;
  remaining: number;
  percentage: number;
}

export function computeQuotaStatus(used: number, _quota: number, tier: 'free' | 'premium' = 'free'): LegacyQuotaStatus {
  const status = QuotaService.getStatus(used, tier);
  return {
    state: status.level,
    used: status.currentCards,
    quota: status.maxCards,
    remaining: status.remainingCards,
    percentage: status.percentage,
  };
}

export function countCards(lists: Array<{ associations?: Array<{ isArchived?: boolean }> }>): number {
  return lists.reduce((sum, list) => sum + (list.associations?.length ?? 0), 0);
}
