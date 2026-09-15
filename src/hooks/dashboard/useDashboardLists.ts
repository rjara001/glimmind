import { useMemo } from "react";
import type { AssociationList } from "../../types";

export const BIG_LIST_THRESHOLD = 200;

export interface DashboardLists {
  recentLists: AssociationList[];
  bigLists: AssociationList[];
  filteredLists: AssociationList[];
  currentList: AssociationList | null;
}

export function useDashboardLists(
  lists: AssociationList[],
  searchTerm: string,
  lastPlayedId?: string,
): DashboardLists {
  const recentLists = useMemo(() => {
    return [...lists]
      .sort((a, b) => {
        if (!a.updatedAt || !b.updatedAt) return 0;
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 3);
  }, [lists]);

  const bigLists = useMemo(() => {
    return lists.filter(
      (list) =>
        (list.associations || []).filter((a) => !a.isArchived).length > BIG_LIST_THRESHOLD,
    );
  }, [lists]);

  const filteredLists = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return lists.filter(
      (list) =>
        list.name.toLowerCase().includes(term) ||
        list.concept.toLowerCase().includes(term),
    );
  }, [lists, searchTerm]);

  const currentList = lastPlayedId ? lists.find((l) => l.id === lastPlayedId) ?? null : null;

  return { recentLists, bigLists, filteredLists, currentList };
}