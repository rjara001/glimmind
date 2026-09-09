import { useCallback } from "react";
import type { AssociationList, Association } from "../types";
import { useGameStore } from "../../store/gameStore";
import { useQuotaValidation } from "./useQuotaValidation";

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
  tier: string | undefined
): AssociationManipulationResult {
  const { level: statusLevel, maxCards } = useQuotaValidation(lists, tier);

  const handleAddRow = useCallback(() => {
    if (statusLevel === 'blocked') {
      const quota = useGameStore.getState()?.quota;
      const tier = quota?.tier || 'free';
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
    const updated = { ...editList, associations: editList.associations.filter(a => a.id !== id) };
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setEditList(updated);
  }, [editList, setEditList, setSelectedIds]);

  const handleUpdateField = useCallback((id: string, field: keyof Association, value: string) => {
    setEditList(current => {
      const nextValue = field === 'definition' ? parseDefinitions(value) : value;
      const updatedAssociations = current.associations.map(a => a.id === id ? { ...a, [field]: nextValue } : a);
      return { ...current, associations: updatedAssociations };
    });
  }, []);

  const handleUpdateTags = useCallback((id: string, tags: string[]) => {
    setEditList(current => {
      const updatedAssociations = current.associations.map(a => {
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
    const updatedAssociations = editList.associations.map(a => a.id === id ? { ...a, isArchived: false } : a);
    setEditList({ ...editList, associations: updatedAssociations });
  }, [editList]);

  const handleRestoreSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updatedAssociations = editList.associations.map(a =>
      selectedIds.has(a.id) ? { ...a, isArchived: false } : a
    );
    setSelectedIds(new Set());
    setEditList({ ...editList, associations: updatedAssociations });
  }, [editList, selectedIds]);

  return {
    handleAddRow,
    handleRemoveRow,
    handleUpdateField,
    handleUpdateTags,
    handleRestoreRow,
    handleRestoreSelected,
  };
}