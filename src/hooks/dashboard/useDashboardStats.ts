import { useMemo } from "react";
import type { AssociationList } from "../../types";
import type { DashboardStats } from "../../types/dashboard";

export function useDashboardStats(lists: AssociationList[]): DashboardStats {
  return useMemo(() => {
    let totalWords = 0;
    let totalLearned = 0;
    lists.forEach((list) => {
      const allAssociations = list.associations || [];
      totalWords += allAssociations.length;
      totalLearned += allAssociations.filter((a) => a.isArchived).length;
    });
    return {
      totalWords,
      totalLearned,
      remaining: totalWords - totalLearned,
      percentage: totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0,
    };
  }, [lists]);
}