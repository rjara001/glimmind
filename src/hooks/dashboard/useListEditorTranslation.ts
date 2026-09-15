import { useCallback } from "react";
import type { AssociationList } from "../../types";
import { translationService } from "../../services/translationService";

export interface UseListEditorTranslationParams {
  editList: AssociationList;
  selectedIds: Set<string>;
  onSave: (list: AssociationList) => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  translateLang: string;
  setEditList: React.Dispatch<React.SetStateAction<AssociationList>>;
  setIsTranslating: React.Dispatch<React.SetStateAction<boolean>>;
  setTranslationUsed: React.Dispatch<React.SetStateAction<number>>;
}

export interface UseListEditorTranslationReturn {
  handleTranslateSelected: () => Promise<void>;
}

export function useListEditorTranslation(
  params: UseListEditorTranslationParams
): UseListEditorTranslationReturn {
  const {
    editList,
    selectedIds,
    onSave,
    showToast,
    translateLang,
    setEditList,
    setIsTranslating,
    setTranslationUsed,
  } = params;

  const handleTranslateSelected = useCallback(async () => {
    const selectedAssociations = editList.associations.filter((a) =>
      selectedIds.has(a.id),
    );
    if (selectedAssociations.length === 0) return;

    const user = await import("../../store/gameStore").then(m => m.useGameStore.getState().user);
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

  return { handleTranslateSelected };
}