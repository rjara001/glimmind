import { useMemo } from "react";
import type { AssociationList } from "../../types";
import { QuotaService } from "../../services/quotaService";
import type { QuotaStatus, TierType } from "../../constants/quotaConfig";

export const BIG_LIST_THRESHOLD = 200;

export interface QuotaValidationResult {
  level: QuotaStatus["level"];
  maxCards: number;
}

export function useQuotaValidation(
  lists: AssociationList[],
  tier: TierType | undefined
): QuotaValidationResult {
  const totalCards = useMemo(
    () => lists.reduce((sum, l) => sum + (l.associations?.length || 0), 0),
    [lists]
  );

  const status = useMemo(() => QuotaService.getStatus(totalCards, tier ?? 'free'), [totalCards, tier]);
  return {
    level: status.level,
    maxCards: status.maxCards,
  };
}