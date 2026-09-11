import type { AssociationList } from "../../types";

export interface ListStats {
  activeAssociations: AssociationList["associations"];
  archivedCount: number;
  totalCount: number;
  canPlay: boolean;
  achievementPercent: number;
  isComplete: boolean;
}

export function useListStats(list: AssociationList): ListStats {
  const allAssociations = list.associations || [];
  const activeAssociations = allAssociations.filter((a) => !a.isArchived);
  const archivedCount = allAssociations.filter((a) => a.isArchived).length;
  const totalCount = allAssociations.length;
  const canPlay = activeAssociations.length > 0;
  const achievementPercent =
    totalCount > 0 ? Math.round((archivedCount / totalCount) * 100) : 0;
  const isComplete = achievementPercent === 100;

  return {
    activeAssociations,
    archivedCount,
    totalCount,
    canPlay,
    achievementPercent,
    isComplete,
  };
}