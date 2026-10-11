import plans from '../config/plans.json';

// NOTE: src/config/plans.json must stay byte-identical to
// backend/src/functions/src/config/plans.json, which is the canonical copy that
// ships with the Cloud Functions. The two build pipelines cannot share a single
// file: Firebase only deploys backend/src/functions/, and vite.config.ts sets
// root to src/ so the frontend cannot reliably import from backend/.
// tests/config/plansDrift.test.ts fails the build if they diverge.

export const QUOTA_CONFIG = plans;

export type TierType = keyof typeof plans.tiers;

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