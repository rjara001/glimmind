import { useMemo } from "react";
import type { AssociationList, Association } from "../../types";

export interface SearchFilterResult {
  filteredActive: Association[];
  filteredArchived: Association[];
  uniqueTags: string[];
  searchTerm: string;
  activeTagFilter: string | null;
}

export function useSearchFilter(
  editList: AssociationList,
  searchTerm: string,
  activeTagFilter: string | null
): SearchFilterResult {
  const activeAssociations = editList.associations.filter(a => !a.isArchived);
  const archivedAssociations = editList.associations.filter(a => a.isArchived);

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    activeAssociations.forEach(a => {
      a.metadata?.tags?.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [activeAssociations]);

  const filteredActive = useMemo(() => {
    return activeAssociations.filter(assoc => {
      const matchesSearch = assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assoc.definition.join('|').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTag = !activeTagFilter || assoc.metadata?.tags?.includes(activeTagFilter);
      return matchesSearch && matchesTag;
    });
  }, [activeAssociations, searchTerm, activeTagFilter]);

  const filteredArchived = useMemo(() => {
    return archivedAssociations.filter(assoc =>
      assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assoc.definition.join('|').toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [archivedAssociations, searchTerm]);

  return {
    filteredActive,
    filteredArchived,
    uniqueTags,
    searchTerm,
    activeTagFilter,
  };
}