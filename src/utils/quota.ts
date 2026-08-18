import { QuotaStatus, QuotaState } from '../types/quota';
import { QUOTA_WARNING_THRESHOLD } from '../constants/limits';

export function computeQuotaStatus(used: number, quota: number): QuotaStatus {
  const safeQuota = Math.max(1, Math.floor(quota));
  const safeUsed = Math.max(0, Math.floor(used));
  const percentage = Math.round((safeUsed / safeQuota) * 100);
  const ratio = safeUsed / safeQuota;
  const state: QuotaState = ratio >= 1 ? 'blocked' : ratio >= QUOTA_WARNING_THRESHOLD ? 'warning' : 'ok';
  return {
    state,
    used: safeUsed,
    quota: safeQuota,
    remaining: Math.max(0, safeQuota - safeUsed),
    percentage,
  };
}

export function countCards(lists: Array<{ associations?: Array<{ isArchived?: boolean }> }>): number {
  return lists.reduce((sum, list) => sum + (list.associations?.length ?? 0), 0);
}
