import { useCallback, useRef } from "react";
import type { Association, AssociationList } from "../../types";
import type { ImportValidationResult, CardCategory } from "../../services/importValidationService";
import { useGameStore } from "../../store/gameStore";
import { QuotaService } from "../../services/quotaService";
import { normalizeAssociations, AssociationLike, parseDefinitions } from "../../utils/normalizeAssociation";
import { translationService } from "../../services/translationService";
import { validateImportCards } from "../../services/importValidationService";
import { downloadAssociationsCsv, parseForPreview } from "../../utils/csv";

export interface UseListEditorActionsParams {
  editList: AssociationList;
  setEditList: React.Dispatch<React.SetStateAction<AssociationList>>;
  selectedIds: Set<string>;
  selectedArchivedIds: Set<string>;
  onSave: (list: AssociationList) => Promise<void>;
  onCreateMultiple: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
  isCreateMode?: boolean;
  onCreateList?: (
    name: string,
    concept: string,
    associations: Association[],
    settings?: Partial<AssociationList["settings"]>,
  ) => Promise<string | null>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  translateLang: string;
  lists: AssociationList[];
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setNameError: React.Dispatch<React.SetStateAction<boolean>>;
  setShowImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  validationResult: ImportValidationResult | null;
  setValidationResult: React.Dispatch<React.SetStateAction<ImportValidationResult | null>>;
  setShowValidationScreen: React.Dispatch<React.SetStateAction<boolean>>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setSelectedArchivedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  onBack: () => void;
  csvHeader: [string, string, string];
  setTranslationUsed: React.Dispatch<React.SetStateAction<number>>;
  setIsTranslating: React.Dispatch<React.SetStateAction<boolean>>;
  isImporting: boolean;
  setIsImporting: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseListEditorActionsReturn {
  cleanupAndSave: (listToSave: AssociationList) => boolean;
  handleSave: () => Promise<void>;
  handleBack: () => void;
  handleRename: (value: string) => void;
  handleRenameBlur: () => void;
  handleAddRow: () => void;
  handleUpdateField: (id: string, field: keyof Association, value: string) => void;
  handleUpdateTags: (id: string, tags: string[]) => void;
  handleBlurRow: () => void;
  handleRemoveRow: (id: string) => void;
  handleTranslateSelected: () => Promise<void>;
  handleExportSelected: () => void;
  handleDeleteSelected: () => void;
  handleRestoreRow: (id: string) => void;
  handleRestoreSelected: () => void;
  handleBulkAdd: (text: string) => void;
  importSelectedCards: (categories: Record<CardCategory, boolean>) => Promise<void>;
  handleBackToEditor: () => void;
}

export function useListEditorActions(
  params: UseListEditorActionsParams
): UseListEditorActionsReturn {
  const {
    editList,
    setEditList,
    selectedIds,
    selectedArchivedIds,
    onSave,
    onCreateMultiple,
    isCreateMode,
    onCreateList,
    showToast,
    translateLang,
    lists,
    isSaving,
    setIsSaving,
    setNameError,
    setShowImportModal,
    validationResult,
    setValidationResult,
    setShowValidationScreen,
    setSelectedIds,
    setSelectedArchivedIds,
    onBack,
    csvHeader,
    setTranslationUsed,
    setIsTranslating,
    setIsImporting,
  } = params;

  const pendingSaveRef = useRef<Promise<void> | null>(null);

  const cleanupAndSave = useCallback(
    (listToSave: AssociationList): boolean => {
      const seenIds = new Set<string>();
      const cleanedAssociations = normalizeAssociations(listToSave.associations)
        .map((assoc) => {
          const term = assoc.term.trim();
          const id =
            !assoc.id || seenIds.has(assoc.id) ? crypto.randomUUID() : assoc.id;
          seenIds.add(id);
          return { ...assoc, id, term };
        })
        .filter(
          (assoc) =>
            assoc.term.trim() !== "" ||
            assoc.definition.some((d) => d.trim() !== ""),
        );

      const { quota: currentQuota, lists: currentLists } = useGameStore.getState();
      const tier = currentQuota?.tier || "free";
      const currentCards = currentLists.reduce(
        (sum, l) => sum + (l.associations?.length || 0),
        0,
      );
      const status = QuotaService.getStatus(currentCards, tier);

      if (status.level === "blocked") {
        showToast(
          `Llegaste a tu límite de ${status.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`,
          "error",
        );
        return false;
      }

      const storedList = currentLists.find((l) => l.id === listToSave.id);
      const storedCount =
        storedList?.associations?.length ?? listToSave.associations.length;
      const growing = cleanedAssociations.length > storedCount;
      if (growing) {
        const otherTotal = currentLists
          .filter((l) => l.id !== listToSave.id)
          .reduce((sum, l) => sum + (l.associations?.length || 0), 0);
        const projected = otherTotal + cleanedAssociations.length;
        const projectedStatus = QuotaService.getStatus(projected, tier);
        if (projectedStatus.level === "blocked") {
          showToast(
            `Llegaste a tu límite de ${projectedStatus.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`,
            "error",
          );
          return false;
        }
        if (projectedStatus.level === "danger") {
          showToast(
            `Te quedan solo ${projectedStatus.remainingCards} tarjetas disponibles`,
            "error",
          );
        }
      }

      const updatedList = { ...listToSave, associations: cleanedAssociations };
      setEditList(updatedList);
      pendingSaveRef.current = Promise.resolve(onSave(updatedList));
      return true;
    },
    [onSave, setEditList, showToast]
  );

  const handleBack = useCallback(async () => {
    onBack();
  }, [onBack]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (!editList.name.trim()) {
      showToast("⚠️ Ponle un nombre a tu mazo antes de guardar.", "error");
      document.getElementById("list-name")?.focus();
      return;
    }
    setIsSaving(true);
    try {
      const saved = cleanupAndSave(editList);
      if (saved && pendingSaveRef.current) {
        await pendingSaveRef.current;
      }
      showToast("Lista guardada", "success");
    } finally {
      setIsSaving(false);
    }
  }, [cleanupAndSave, editList, isSaving, showToast, setIsSaving]);

  const handleRename = useCallback((value: string) => {
    setEditList((current) => ({ ...current, name: value }));
    if (value.trim()) setNameError(false);
  }, [setEditList, setNameError]);

  const handleRenameBlur = useCallback(() => {
    // Solo actualiza el estado local, no guarda
  }, []);

  const handleAddRow = useCallback(() => {
    const { quota: currentQuota, lists: currentLists } = useGameStore.getState();
    const tier = currentQuota?.tier || "free";
    const status = QuotaService.getStatus(
      currentLists.reduce((sum, l) => sum + (l.associations?.length || 0), 0),
      tier,
    );
    if (status.level === "blocked") {
      showToast(
        `Llegaste a tu límite de ${status.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`,
        "error",
      );
      return;
    }
    const newAssociation: Association = {
      id: crypto.randomUUID(),
      term: "",
      definition: [],
      currentCycle: 1,
      status: "pending",
      isLearned: false,
      isArchived: false,
    };
    setEditList((current) => ({
      ...current,
      associations: [newAssociation, ...current.associations],
    }));
  }, [showToast, setEditList]);

  const handleUpdateField = useCallback(
    (id: string, field: keyof Association, value: string) => {
      setEditList((current) => {
        const nextValue =
          field === "definition" ? parseDefinitions(value) : value;
        const updatedAssociations = current.associations.map((a) =>
          a.id === id ? { ...a, [field]: nextValue } : a,
        );
        return { ...current, associations: updatedAssociations };
      });
    },
    [setEditList]
  );

  const handleUpdateTags = useCallback(
    (id: string, tags: string[]) => {
      setEditList((current) => {
        const updatedAssociations = current.associations.map((a) => {
          if (a.id !== id) return a;
          return {
            ...a,
            metadata: {
              difficulty: a.metadata?.difficulty ?? "basic",
              frequencyRank: a.metadata?.frequencyRank ?? 0,
              audioTimestamp: a.metadata?.audioTimestamp,
              tags,
            },
          };
        });
        return { ...current, associations: updatedAssociations };
      });
    },
    [setEditList]
  );

  const handleBlurRow = useCallback(() => {
    cleanupAndSave(editList);
  }, [cleanupAndSave, editList]);

  const handleRemoveRow = useCallback(
    (id: string) => {
      const updated = {
        ...editList,
        associations: editList.associations.filter((a) => a.id !== id),
      };
      cleanupAndSave(updated);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [editList, cleanupAndSave, setSelectedIds]
  );

  const handleTranslateSelected = useCallback(async () => {
    const selectedAssociations = editList.associations.filter((a) =>
      selectedIds.has(a.id),
    );
    if (selectedAssociations.length === 0) return;

    const user = useGameStore.getState().user;
    if (!user) {
      showToast("Debes iniciar sesión para traducir.", "error");
      return;
    }

    setIsTranslating(true);
    try {
      const cards = selectedAssociations.map((a) => ({
        term: a.term,
        context: a.context,
      }));
      const response = await translationService.translateBatch(
        user.uid,
        cards,
        translateLang,
      );

      const updatedAssociations = editList.associations.map((a) => {
        if (!selectedIds.has(a.id)) return a;
        const translation = response.translations.find(
          (t) => t.original === a.term,
        );
        const translatedText = translation
          ? translation.translated
          : a.translation;
        return {
          ...a,
          definition: translatedText ? [translatedText] : a.definition,
          translation: translatedText,
        };
      });

      const updatedList = { ...editList, associations: updatedAssociations };
      setEditList(updatedList);
      onSave(updatedList);

      if (response.quotaExceeded) {
        showToast("Se agotó la cuota de traducción.", "error");
      } else {
        setTranslationUsed((prev) => prev + response.consumedChars);
        const remaining = response.userRemainingChars;
        showToast(
          `Traducidas ${response.translations.length} tarjetas. Quedan ${remaining} caracteres.`,
          "success",
        );
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Error al traducir.",
        "error",
      );
    } finally {
      setIsTranslating(false);
    }
  }, [
    editList,
    selectedIds,
    onSave,
    showToast,
    translateLang,
    setEditList,
    setTranslationUsed,
    setIsTranslating,
  ]);

  const handleExportSelected = useCallback(() => {
    const selectedAssociations = editList.associations.filter((a) =>
      selectedIds.has(a.id),
    );
    if (selectedAssociations.length === 0) return;
    const fileName = `${editList.name.replace(/[^a-zA-Z0-9]/g, "_")}_export.csv`;
    downloadAssociationsCsv(selectedAssociations, fileName, csvHeader);
    showToast(`Exportadas ${selectedAssociations.length} tarjetas`, "success");
  }, [editList, selectedIds, csvHeader, showToast]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updated = {
      ...editList,
      associations: editList.associations.filter((a) => !selectedIds.has(a.id)),
    };
    cleanupAndSave(updated);
    setSelectedIds(new Set());
  }, [editList, selectedIds, cleanupAndSave, setSelectedIds]);

  const handleRestoreRow = useCallback(
    (id: string) => {
      const updatedAssociations = editList.associations.map((a) =>
        a.id === id ? { ...a, isArchived: false } : a,
      );
      cleanupAndSave({ ...editList, associations: updatedAssociations });
    },
    [editList, cleanupAndSave]
  );

  const handleRestoreSelected = useCallback(() => {
    if (selectedArchivedIds.size === 0) return;
    const updatedAssociations = editList.associations.map((a) =>
      selectedArchivedIds.has(a.id) ? { ...a, isArchived: false } : a,
    );
    cleanupAndSave({ ...editList, associations: updatedAssociations });
    setSelectedArchivedIds(new Set());
  }, [editList, selectedArchivedIds, cleanupAndSave, setSelectedArchivedIds]);

  const handleBulkAdd = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      if (!editList.name.trim()) {
        setNameError(true);
        document.getElementById("list-name")?.focus();
        showToast(
          "⚠️ Ponle un nombre a tu mazo antes de importar.",
          "error",
        );
        return;
      }
      const { quota: currentQuota } = useGameStore.getState();
      const tier = currentQuota?.tier || "free";
      const status = QuotaService.getStatus(
        lists.reduce((sum, l) => sum + (l.associations?.length || 0), 0),
        tier,
      );
      if (status.level === "blocked") {
        showToast(
          `Llegaste a tu límite de ${status.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`,
          "error",
        );
        return;
      }
      const preview = parseForPreview(text);
      const newAssocs: Association[] = normalizeAssociations(
        preview.rows.map<AssociationLike>((triple) => ({
          id: crypto.randomUUID(),
          term: triple.value1,
          definition: triple.value2,
          context: triple.context,
          currentCycle: 1,
          status: "pending",
          isLearned: false,
          isArchived: false,
        })),
      );
      const allLists = [...lists.filter((l) => l.id !== editList.id), editList];
      const validationResult = validateImportCards(newAssocs, allLists);
      setValidationResult(validationResult);
      setShowImportModal(false);
      setShowValidationScreen(true);
    },
    [
      editList,
      lists,
      showToast,
      setNameError,
      setShowImportModal,
      setShowValidationScreen,
      setValidationResult,
    ]
  );

  const importSelectedCards = useCallback(
    async (categories: Record<CardCategory, boolean>) => {
      if (!validationResult) return;
      setIsImporting(true);
      try {
        const categorized = validationResult.categorized;

        const toImport: Association[] = [];
        for (const cat of categorized) {
          if (!categories[cat.category]) continue;
          toImport.push({
            id: crypto.randomUUID(),
            term: cat.card.term,
            definition: cat.card.definition.split(" | "),
            currentCycle: 1,
            status: "pending",
            isLearned: false,
            isArchived: false,
          });
        }

        if (toImport.length === 0) {
          showToast("⚠️ No hay tarjetas para importar.", "error");
          setShowValidationScreen(false);
          return;
        }

        const MAX = 100;
        const deckCount = Math.ceil(toImport.length / MAX);

        if (deckCount === 1) {
          if (isCreateMode && onCreateList) {
            const id = await onCreateList(
              editList.name,
              editList.concept,
              [...editList.associations, ...toImport],
              editList.settings,
            );
            if (id) {
              showToast(`✅ ${toImport.length} tarjetas importadas`, "success");
              setShowValidationScreen(false);
              onBack();
            } else {
              setShowValidationScreen(false);
            }
            return;
          }
          const updated = { ...editList, associations: [...editList.associations, ...toImport] };
          await onSave(updated);
          showToast(`✅ ${toImport.length} tarjetas importadas`, "success");
          setShowValidationScreen(false);
          onBack();
          return;
        }

        if (!onCreateMultiple) {
          showToast("⚠️ No se puede dividir en múltiples mazos.", "error");
          setShowValidationScreen(false);
          return;
        }

        const groups: { name: string; associations: Association[] }[] = [];
        for (let i = 0; i < deckCount; i++) {
          const chunk = toImport.slice(i * MAX, (i + 1) * MAX);
          const name = i === 0 ? editList.name : `${editList.name}-${i + 1}`;
          groups.push({ name, associations: chunk });
        }

        const firstGroup = groups[0];

        let firstId: string | null | undefined;
        if (isCreateMode && onCreateList) {
          firstId = await onCreateList(
            firstGroup.name,
            editList.concept,
            firstGroup.associations,
            editList.settings,
          );
        } else {
          const updated = { ...editList, associations: firstGroup.associations };
          setEditList(updated);
          await onSave(updated);

          let savedList: AssociationList | undefined;
          for (let i = 0; i < 10; i++) {
            await new Promise((resolve) => setTimeout(resolve, 200));
            savedList = useGameStore.getState().lists.find(
              (l) => l.name === firstGroup.name
            );
            if (savedList) break;
          }
          firstId = savedList?.id;
        }

        if (!firstId) {
          showToast("⚠️ No se pudo guardar el mazo antes de dividir.", "error");
          setShowValidationScreen(false);
          return;
        }

        await onCreateMultiple(groups.slice(1), firstId);

        showToast(`✅ ${toImport.length} tarjetas importadas en ${deckCount} mazos`, "success");
        setShowValidationScreen(false);
        onBack();
      } finally {
        setIsImporting(false);
      }
    },
    [validationResult, editList, onSave, onCreateMultiple, onCreateList, isCreateMode, showToast, onBack, setShowValidationScreen, setEditList, setIsImporting]
  );

  const handleBackToEditor = useCallback(() => {
    setShowValidationScreen(false);
    setValidationResult(null);
  }, [setShowValidationScreen, setValidationResult]);

  return {
    cleanupAndSave,
    handleSave,
    handleBack,
    handleRename,
    handleRenameBlur,
    handleAddRow,
    handleUpdateField,
    handleUpdateTags,
    handleBlurRow,
    handleRemoveRow,
    handleTranslateSelected,
    handleExportSelected,
    handleDeleteSelected,
    handleRestoreRow,
    handleRestoreSelected,
    handleBulkAdd,
    importSelectedCards,
    handleBackToEditor,
  };
}