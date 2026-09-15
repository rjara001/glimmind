import { useMemo } from "react";
import type { AssociationList } from "../../types";
import type { QuotaStatus } from "../../types/quota";
import { useGameStore } from "../../store/gameStore";
import { QuotaService } from "../../services/quotaService";

export interface ListEditorQuotaData {
  quotaStatus: QuotaStatus | null;
  translationUsed: number;
  translationLimit: number;
  translationPercentage: number;
  translationState: "ok" | "warning" | "blocked";
  uniqueTags: string[];
}

export function useListEditorQuota(
  editList: AssociationList
): ListEditorQuotaData {
  const quota = useGameStore((state) => state.quota);
  const lists = useGameStore((state) => state.lists);

  const projectedTotal = useMemo(() => {
    const otherTotal = lists
      .filter((l) => l.id !== editList.id)
      .reduce((sum, l) => sum + (l.associations?.length || 0), 0);
    return otherTotal + editList.associations.length;
  }, [lists, editList]);

  const quotaStatus = useMemo(() => {
    if (!quota) return null;
    return QuotaService.getStatus(projectedTotal, quota.tier);
  }, [quota, projectedTotal]);

  const translationUsed = quota?.translationCharsUsed ?? 0;
  const translationLimit = quota?.translationCharLimit ?? 20000;
  const translationPercentage = Math.min(
    100,
    (translationUsed / translationLimit) * 100,
  );
  const translationState =
    translationPercentage >= 100
      ? "blocked"
      : translationPercentage >= 70
        ? "warning"
        : "ok";

  const activeAssociations = useMemo(
    () => editList.associations.filter((a) => !a.isArchived),
    [editList]
  );

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    activeAssociations.forEach((a) => {
      a.metadata?.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [activeAssociations]);

  return {
    quotaStatus,
    translationUsed,
    translationLimit,
    translationPercentage,
    translationState,
    uniqueTags,
  };
}