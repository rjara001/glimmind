import { QuotaService } from '../services/quotaService';

interface LegacyQuotaStatus {
  state: 'ok' | 'warning' | 'danger' | 'blocked';
  used: number;
  quota: number;
  remaining: number;
  percentage: number;
}

export function computeQuotaStatus(used: number, quota: number, tier: 'free' | 'premium' = 'free'): LegacyQuotaStatus {
  // Handle edge cases from tests
  const effectiveQuota = Math.max(1, quota);
  const effectiveUsed = Math.max(0, used);
  const status = QuotaService.getStatus(effectiveUsed, tier);
  
  // Override with passed quota if different from tier config
  return {
    state: status.level,
    used: effectiveUsed,
    quota: effectiveQuota,
    remaining: Math.max(0, effectiveQuota - effectiveUsed),
    percentage: effectiveQuota > 0 ? Math.round((effectiveUsed / effectiveQuota) * 100) : 0,
  };
}

export function countCards(lists: Array<{ associations?: Array<{ isArchived?: boolean }> }>): number {
  return lists.reduce((sum, list) => sum + (list.associations?.length ?? 0), 0);
}
