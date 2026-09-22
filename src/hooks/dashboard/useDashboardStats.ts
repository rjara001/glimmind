import { useMemo } from "react";
import type { AssociationList } from "../../types";
import type { DashboardStats } from "../../types/dashboard";
import { computeStateBreakdown } from "../../utils/progress";

export function useDashboardStats(lists: AssociationList[]): DashboardStats {
  return useMemo(() => {
    let totalWords = 0;
    let totalLearned = 0;
    lists.forEach((list) => {
      const allAssociations = list.associations || [];
      totalWords += allAssociations.length;
      const breakdown = computeStateBreakdown(allAssociations);
      totalLearned += breakdown.aprendidas;
    });
    return {
      totalWords,
      totalLearned,
      remaining: totalWords - totalLearned,
      percentage: totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0,
    };
  }, [lists]);
}