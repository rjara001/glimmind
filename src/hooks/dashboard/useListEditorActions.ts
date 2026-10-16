import { useCallback, useRef } from "react";
import type { Association, AssociationList } from "../../types";
import type { ImportValidationResult, CardCategory } from "../../services/importValidationService";
import type { BulkCreateHandler } from "../../types/list-service";
import { useGameStore } from "../../store/gameStore";
import { QuotaService } from "../../services/quotaService";
import { normalizeAssociations, AssociationLike, parseDefinitions } from "../../utils/normalizeAssociation";
import { translationService } from "../../services/translationService";
import { validateImportCards } from "../../services/importValidationService";
import { downloadAssociationsCsv, parseForPreview } from "../../utils/csv";
import { MAX_CARDS_PER_DECK } from "../../constants/limits";

export interface UseListEditorActionsParams {
  editList: AssociationList;
  setEditList: React.Dispatch<React.SetStateAction<AssociationList>>;
  selectedIds: Set<string>;
  selectedArchivedIds: Set<string>;
  onSave: (list: AssociationList) => Promise<void>;
  onCreateMultiple: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
  isCreateMode?: boolean;
  onBulkCreate?: BulkCreateHandler;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  translateLang: string;
  lists: AssociationList[];
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setNameError: React.Dispatch<React.SetStateAction<boolean>>;
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
  importLimit: number | null;
  setImportLimit: React.Dispatch<React.SetStateAction<number | null>>;
  isValidating: boolean;
  setIsValidating: React.Dispatch<React.SetStateAction<boolean>>;
  setValidationProgress: React.Dispatch<React.SetStateAction<number>>;
}

export interface UseListEditorActionsReturn {
  cleanupAndSave: (listToSave: AssociationList, options?: { allowEmpty?: boolean }) => boolean;
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
  handleBulkAdd: (text: string) => Promise<void>;
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
    onBulkCreate,
    showToast,
    translateLang,
    lists,
    isSaving,
    setIsSaving,
    setNameError,
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
    importLimit,
    setImportLimit,
    isValidating,
    setIsValidating,
    setValidationProgress,
  } = params;

  const pendingSaveRef = useRef<Promise<void> | null>(null);

  const cleanupAndSave = useCallback(
    (listToSave: AssociationList, options?: { allowEmpty?: boolean }): boolean => {
      const allowEmpty = options?.allowEmpty === true;
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

      // A save that empties the deck is only legitimate when the user deleted
      // rows on purpose. Without this guard, a deck that renders as empty (for
      // example a corrupted cloud copy) gets wiped by any auto-save on blur
      // (see docs/issues/P0/2026-10-15-updateListFields-corrompe-associations.md).
      if (!allowEmpty && cleanedAssociations.length === 0) {
        showToast(
          "No se guardó: el mazo quedaría sin tarjetas. Si quieres eliminarlo, bórralo desde el panel.",
          "error",
        );
        return false;
      }

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

  const handleBlurRow = useCallback(async () => {
    cleanupAndSave(editList);
    if (pendingSaveRef.current) {
      try {
        await pendingSaveRef.current;
      } catch (error) {
        console.error('[handleBlurRow] save failed:', error);
      }
    }
  }, [cleanupAndSave, editList]);

  const handleRemoveRow = useCallback(
    (id: string) => {
      const updated = {
        ...editList,
        associations: editList.associations.filter((a) => a.id !== id),
      };
      cleanupAndSave(updated, { allowEmpty: true });
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
    cleanupAndSave(updated, { allowEmpty: true });
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
    async (text: string) => {
      if (isValidating) return;
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

      // Quota headroom for this import. In create mode the rows already typed
      // in the editor are not in the store quota yet, so discount them too;
      // otherwise the bulk would exceed maxCards once saved. In edit mode the
      // deck is already counted, so remainingCards alone is the ceiling.
      const editorRows = isCreateMode ? editList.associations.length : 0;
      setImportLimit(Math.max(0, status.remainingCards - editorRows));

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
      setIsValidating(true);
      setValidationProgress(0);
      try {
        // Async + chunked: the O(N x M) similarity scan yields to the event
        // loop so the tab never freezes; the button shows "Validando... [X%]".
        const validationResult = await validateImportCards(newAssocs, allLists, {
          onProgress: ({ processed, total }) => {
            setValidationProgress(
              total > 0 ? Math.round((processed / total) * 100) : 100,
            );
          },
        });
        setValidationResult(validationResult);
        setShowValidationScreen(true);
      } finally {
        setIsValidating(false);
        setValidationProgress(0);
      }
    },
    [
      isValidating,
      editList,
      lists,
      showToast,
      setNameError,
      setShowValidationScreen,
      setValidationResult,
      setIsValidating,
      setValidationProgress,
      setImportLimit,
      isCreateMode,
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

        // Truncate to the quota headroom computed when validation opened. File
        // order is preserved (categorized is built by iterating the parsed
        // cards in order), so the first N cards win regardless of category.
        const truncated = importLimit != null && toImport.length > importLimit;
        const accepted = truncated ? toImport.slice(0, importLimit!) : toImport;
        const discarded = toImport.length - accepted.length;
        const discardedNote = truncated
          ? ` (${discarded} fuera por tu límite)`
          : "";

        // Create mode: the whole payload goes in ONE bulk request. The server
        // splits it into decks and persists everything atomically, replacing
        // the old per-deck createList loop that died against the rate limit
        // (20 decks x 100 cards = 2000 cards, then HTTP 429).
        if (isCreateMode) {
          if (!onBulkCreate) {
            showToast("⚠️ No se puede importar en este modo.", "error");
            setShowValidationScreen(false);
            return;
          }
          const ids = await onBulkCreate({
            name: editList.name,
            concept: editList.concept,
            associations: [...editList.associations, ...accepted],
            settings: editList.settings,
            cardsPerDeck: MAX_CARDS_PER_DECK,
          });
          if (!ids || ids.length === 0) {
            setShowValidationScreen(false);
            return;
          }
          showToast(
            ids.length === 1
              ? `✅ ${accepted.length} tarjetas importadas${discardedNote}`
              : `✅ ${accepted.length} tarjetas importadas en ${ids.length} mazos${discardedNote}`,
            "success",
          );
          setShowValidationScreen(false);
          onBack();
          return;
        }

        // Edit mode: deckCount drives whether this is a single-deck append or
        // a splitList call (already a single HTTP request for every deck).
        const MAX = MAX_CARDS_PER_DECK;
        const deckCount = Math.ceil(accepted.length / MAX);

        if (deckCount === 1) {
          const updated = { ...editList, associations: [...editList.associations, ...accepted] };
          await onSave(updated);
          showToast(`✅ ${accepted.length} tarjetas importadas${discardedNote}`, "success");
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
          const chunk = accepted.slice(i * MAX, (i + 1) * MAX);
          const name = i === 0 ? editList.name : `${editList.name}-${i + 1}`;
          groups.push({ name, associations: chunk });
        }

        // groups[0] replaces this deck in place on the backend and the
        // original document is never deleted, so nothing is pre-saved here
        // (docs/issues/done/2026-10-15-splitlist-borra-mazo-original.md).
        await onCreateMultiple(groups, editList.id);

        showToast(`✅ ${accepted.length} tarjetas importadas en ${deckCount} mazos${discardedNote}`, "success");
        setShowValidationScreen(false);
        onBack();
      } finally {
        setIsImporting(false);
      }
    },
    [validationResult, editList, onSave, onCreateMultiple, onBulkCreate, isCreateMode, showToast, onBack, setShowValidationScreen, setIsImporting]
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