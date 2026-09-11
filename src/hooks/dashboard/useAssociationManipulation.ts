import { useCallback } from "react";
import type { AssociationList, Association } from "../../types";
import type { TierType } from "../../constants/quotaConfig";
import { useGameStore } from "../../store/gameStore";
import { useQuotaValidation } from "./useQuotaValidation";
import { useToast } from "../../components/layout/Toast";
import { parseDefinitions } from "../../utils/normalizeAssociation";

export interface AssociationManipulationResult {
  handleAddRow: () => void;
  handleRemoveRow: (id: string) => void;
  handleUpdateField: (id: string, field: keyof Association, value: string) => void;
  handleUpdateTags: (id: string, tags: string[]) => void;
  handleRestoreRow: (id: string) => void;
  handleRestoreSelected: () => void;
}

export function useAssociationManipulation(
  editList: AssociationList,
  setEditList: React.Dispatch<React.SetStateAction<AssociationList>>,
  lists: AssociationList[],
  tier: TierType | undefined,
  selectedIds: Set<string>,
  setSelectedIds: (ids: Set<string>) => void
): AssociationManipulationResult {
  const { showToast } = useToast();
  const { level: statusLevel, maxCards } = useQuotaValidation(lists, tier);

  const handleAddRow = useCallback(() => {
    if (statusLevel === 'blocked') {
      const quota = useGameStore.getState()?.quota;
      const _tier = quota?.tier || 'free';
      void _tier;
      showToast(`Llegaste a tu límite de ${maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`, 'error');
      return;
    }
    const newAssociation: Association = {
      id: crypto.randomUUID(),
      term: '',
      definition: [],
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    };
    setEditList(current => ({ ...current, associations: [newAssociation, ...current.associations] }));
  }, [statusLevel, maxCards, setEditList]);

  const handleRemoveRow = useCallback((id: string) => {
    const updated = { ...editList, associations: editList.associations.filter((a: Association) => a.id !== id) };
    const nextSelectedIds = new Set(selectedIds);
    nextSelectedIds.delete(id);
    setSelectedIds(nextSelectedIds);
    setEditList(updated);
  }, [editList, selectedIds, setSelectedIds, setEditList]);

  const handleUpdateField = useCallback((id: string, field: keyof Association, value: string) => {
    setEditList(current => {
      const nextValue = field === 'definition' ? parseDefinitions(value) : value;
      const updatedAssociations = current.associations.map((a: Association) => a.id === id ? { ...a, [field]: nextValue } : a);
      return { ...current, associations: updatedAssociations };
    });
  }, []);

  const handleUpdateTags = useCallback((id: string, tags: string[]) => {
    setEditList(current => {
      const updatedAssociations = current.associations.map((a: Association) => {
        if (a.id !== id) return a;
        return {
          ...a,
          metadata: {
            difficulty: a.metadata?.difficulty ?? 'basic',
            frequencyRank: a.metadata?.frequencyRank ?? 0,
            audioTimestamp: a.metadata?.audioTimestamp,
            tags,
          },
        };
      });
      return { ...current, associations: updatedAssociations };
    });
  }, []);

  const handleRestoreRow = useCallback((id: string) => {
    const updatedAssociations = editList.associations.map((a: Association) => a.id === id ? { ...a, isArchived: false } : a);
    setEditList({ ...editList, associations: updatedAssociations });
  }, [editList]);

  const handleRestoreSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updatedAssociations = editList.associations.map((a: Association) =>
      selectedIds.has(a.id) ? { ...a, isArchived: false } : a
    );
    setSelectedIds(new Set());
    setEditList({ ...editList, associations: updatedAssociations });
  }, [editList, selectedIds, setSelectedIds]);

  return {
    handleAddRow,
    handleRemoveRow,
    handleUpdateField,
    handleUpdateTags,
    handleRestoreRow,
    handleRestoreSelected,
  };
}