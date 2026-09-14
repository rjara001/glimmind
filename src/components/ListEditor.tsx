import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  FormEvent,
} from "react";
import type { AssociationList, Association } from "../types";
import type { AIGroupSuggestion } from "../services/aiService";
import {
  normalizeAssociations,
  AssociationLike,
  parseDefinitions,
} from "../utils/normalizeAssociation";
import { SmartGroupModal } from "../components/modals/SmartGroupModal";
import { useGameStore } from "../store/gameStore";
import { QuotaService } from "../services/quotaService";
import { downloadAssociationsCsv, parseForPreview } from "../utils/csv";
import { useToast } from "../components/layout/Toast";
import { QuotaAlert } from "../components/layout/QuotaAlert";
import { AssociationTable } from "../components/list-editor/AssociationTable";
import { BulkImport } from "../components/list-editor/BulkImport";
import { ValidationScreen } from "../components/list-editor/ValidationScreen";
import { CreateListForm } from "./views/dashboard/CreateListForm";
import { translationService } from "../services/translationService";
import { validateImportCards } from "../services/importValidationService";
import type {
  ImportValidationResult,
  CardCategory,
} from "../services/importValidationService";

type SortField = "term" | "definition";

interface TableSort {
  field: SortField;
  direction: "asc" | "desc";
}

function nextSort(current: TableSort | null, field: SortField): TableSort {
  if (current && current.field === field) {
    return { field, direction: current.direction === "asc" ? "desc" : "asc" };
  }
  return { field, direction: "asc" };
}

function sortAssociations(
  associations: Association[],
  tableSort: TableSort | null,
): Association[] {
  if (!tableSort) return associations;
  const { field, direction } = tableSort;
  return [...associations].sort((a, b) => {
    const aValue = (
      field === "definition" ? a.definition.join("|") : a.term
    ).toLowerCase();
    const bValue = (
      field === "definition" ? b.definition.join("|") : b.term
    ).toLowerCase();
    const comparison = aValue.localeCompare(bValue);
    return direction === "asc" ? comparison : -comparison;
  });
}

interface ListEditorProps {
  list: AssociationList;
  initialEditId?: string | null;
  onInitialEditConsumed?: () => void;
  onSave: (list: AssociationList) => Promise<void> | void;
  onBack: () => void;
  onBackLabel?: string;
  onCreateMultiple?: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
}

export const ListEditor: React.FC<ListEditorProps> = ({
  list,
  initialEditId,
  onInitialEditConsumed,
  onSave,
  onBack,
  onBackLabel = "Volver al dashboard",
  onCreateMultiple,
}) => {
  const { showToast } = useToast();
  const [showBulk, setShowBulk] = useState(false);
  const [editList, setEditList] = useState<AssociationList>(list);
  const [searchTerm, setSearchTerm] = useState("");
  const [aiSuggestions, setAiSuggestions] = useState<
    AIGroupSuggestion[] | null
  >(null);
  const [activeSort, setActiveSort] = useState<TableSort | null>(null);
  const [archivedSort, setArchivedSort] = useState<TableSort | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(
    new Set(),
  );
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState("es");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ImportValidationResult | null>(null);
  const [showValidationScreen, setShowValidationScreen] = useState(false);
  const pendingSaveRef = useRef<Promise<void> | null>(null);

  const conceptParts = editList.concept.split("/");
  const termHeader = conceptParts[0] || "Term";
  const definitionHeader = conceptParts[1] || "Definition";
  const contextHeader = conceptParts[2] || "Context";
  const csvHeader: [string, string, string] = [
    termHeader,
    definitionHeader,
    contextHeader,
  ];

  const quota = useGameStore((state) => state.quota);
  const lists = useGameStore((state) => state.lists);
  const isPremium = quota?.tier === "premium";

  const [translationUsed, setTranslationUsed] = useState(
    () => quota?.translationCharsUsed ?? 0,
  );
  const translationLimit = quota?.translationCharLimit ?? 20000;
  const translationPercentage = Math.min(
    100,
    (translationUsed / translationLimit) * 100,
  );
  const translationState =
    translationPercentage >= 100
      ? "blocked"
      : translationPercentage >= 70
      ? "warning"
      : "ok";
  const [nameError, setNameError] = useState(false);

  const projectedTotal = useMemo(() => {
    const otherTotal = lists
      .filter((l) => l.id !== editList.id)
      .reduce((sum, l) => sum + (l.associations?.length || 0), 0);
    return otherTotal + editList.associations.length;
  }, [lists, editList]);

  const quotaStatus = useMemo(() => {
    if (!quota) return null;
    return QuotaService.getStatus(projectedTotal, quota.tier);
  }, [quota, projectedTotal]);

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

      const { quota, lists } = useGameStore.getState();
      const tier = quota?.tier || "free";
      const currentCards = lists.reduce(
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

      const storedList = lists.find((l) => l.id === listToSave.id);
      const storedCount =
        storedList?.associations?.length ?? listToSave.associations.length;
      const growing = cleanedAssociations.length > storedCount;
      if (growing) {
        const otherTotal = lists
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
      showToast("Lista guardada", "success");
      return true;
    },
    [onSave],
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
    } finally {
      setIsSaving(false);
    }
  }, [cleanupAndSave, editList, isSaving, showToast]);

  useEffect(() => {
    const initialAssociations = list.associations;
    let needsCleanup = false;
    const seenIds = new Set<string>();
    for (const assoc of initialAssociations) {
      const definitionClean =
        assoc.definition.length > 0 &&
        assoc.definition.every((d) => d.trim() === d);
      const emptyCard =
        assoc.term.trim() === "" &&
        assoc.definition.every((d) => d.trim() === "");
      if (
        !assoc.id ||
        seenIds.has(assoc.id) ||
        assoc.term.trim() !== assoc.term ||
        !definitionClean ||
        emptyCard
      ) {
        needsCleanup = true;
        break;
      }
      seenIds.add(assoc.id);
    }
    if (needsCleanup) {
      cleanupAndSave(list);
    }
  }, [list, cleanupAndSave]);

  const handleBulkAdd = (text: string) => {
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
    const { quota } = useGameStore.getState();
    const tier = quota?.tier || "free";
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
        status: "pending" as const,
        isLearned: false,
        isArchived: false,
      })),
    );
    const allLists = [...lists.filter((l) => l.id !== editList.id), editList];
    const validationResult = validateImportCards(newAssocs, allLists);
    setValidationResult(validationResult);
    setShowImportModal(false);
    setShowValidationScreen(true);
  };
const importSelectedCards = async (categories: Record<CardCategory, boolean>) => {
  if (!validationResult) return;
  const categorized = validationResult.categorized;

  const toImport: Association[] = [];
  for (const cat of categorized) {
    if (!categories[cat.category]) continue;
    toImport.push({
      id: crypto.randomUUID(),
      term: cat.card.term,
      definition: cat.card.definition.split(' | '),
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    });
  }

  if (toImport.length === 0) {
    showToast('⚠️ No hay tarjetas para importar.', 'error');
    setShowValidationScreen(false);
    return;
  }

  const MAX = 100;
  const deckCount = Math.ceil(toImport.length / MAX);

  // Caso 1: un solo mazo
  if (deckCount === 1) {
    const updated = { ...editList, associations: [...editList.associations, ...toImport] };
    await onSave(updated);
    showToast(`✅ ${toImport.length} tarjetas importadas`, 'success');
    setShowValidationScreen(false);
    onBack();
    return;
  }

  // Caso 2: múltiples mazos
  if (!onCreateMultiple) {
    showToast('⚠️ No se puede dividir en múltiples mazos.', 'error');
    setShowValidationScreen(false);
    return;
  }

  const groups: { name: string; associations: Association[] }[] = [];
  for (let i = 0; i < deckCount; i++) {
    const chunk = toImport.slice(i * MAX, (i + 1) * MAX);
    const name = i === 0 ? editList.name : `${editList.name}-${i + 1}`;
    groups.push({ name, associations: chunk });
  }

  // 1. Guardar el mazo actual con SOLO el primer grupo
  const firstGroup = groups[0];
  const updated = { ...editList, associations: firstGroup.associations };
  setEditList(updated);

  // 2. ESPERAR a que se guarde en Firestore (que deje de ser temp_)
  await onSave(updated);

  // 3. ESPERAR a que el store se sincronice Y que el ID real esté disponible

let savedList: AssociationList | undefined;
for (let i = 0; i < 10; i++) {
  await new Promise((resolve) => setTimeout(resolve, 200));
  savedList = useGameStore.getState().lists.find(
    (l) => l.name === firstGroup.name && !l.id.startsWith('temp_')
  );
  if (savedList) break;
}

if (!savedList) {
  showToast('⚠️ No se pudo guardar el mazo antes de dividir.', 'error');
  setShowValidationScreen(false);
  return;
}

// 4. Dividir usando el ID REAL
await onCreateMultiple(groups.slice(1), savedList.id); // ← Pasar el ID real

  console.log('=== VERIFICACIÓN POST-GUARDADO ===');
  console.log('savedList:', savedList);
  console.log('savedList.id:', savedList?.id);
  console.log('savedList.isDraft:', savedList?.isDraft);

  if (!savedList) {
    showToast('⚠️ No se pudo guardar el mazo antes de dividir.', 'error');
    setShowValidationScreen(false);
    return;
  }

  // 4. Ahora sí, dividir (usando el ID real)
  await onCreateMultiple(groups.slice(1));

  showToast(`✅ ${toImport.length} tarjetas importadas en ${deckCount} mazos`, 'success');
  setShowValidationScreen(false);
  onBack();
};
  const handleBackToEditor = useCallback(() => {
    setShowValidationScreen(false);
    setValidationResult(null);
  }, [validationResult]);

  const handleRename = useCallback((value: string) => {
    setEditList((current) => ({ ...current, name: value }));
    if (value.trim()) setNameError(false);
  }, []);

  const handleRenameBlur = useCallback(() => {
    // Solo actualiza el estado local, no guarda
  }, []);

  const handleAddRow = () => {
    const { quota } = useGameStore.getState();
    const tier = quota?.tier || "free";
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
  };

  const handleUpdateField = (
    id: string,
    field: keyof Association,
    value: string,
  ) => {
    setEditList((current) => {
      const nextValue =
        field === "definition" ? parseDefinitions(value) : value;
      const updatedAssociations = current.associations.map((a) =>
        a.id === id ? { ...a, [field]: nextValue } : a,
      );
      return { ...current, associations: updatedAssociations };
    });
  };

  const handleUpdateTags = (id: string, tags: string[]) => {
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
  };

  const handleBlurRow = () => {
    cleanupAndSave(editList);
  };

  const handleRemoveRow = (id: string) => {
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
  };

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
  }, [editList, selectedIds, onSave, showToast, translateLang]);

  const handleExportSelected = useCallback(() => {
    const selectedAssociations = editList.associations.filter((a) =>
      selectedIds.has(a.id),
    );
    if (selectedAssociations.length === 0) return;
    const fileName = `${editList.name.replace(
      /[^a-zA-Z0-9]/g,
      "_",
    )}_export.csv`;
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
  }, [editList, selectedIds, cleanupAndSave]);

  const handleRestoreRow = (id: string) => {
    const updatedAssociations = editList.associations.map((a) =>
      a.id === id ? { ...a, isArchived: false } : a,
    );
    cleanupAndSave({ ...editList, associations: updatedAssociations });
  };

  const handleRestoreSelected = useCallback(() => {
    if (selectedArchivedIds.size === 0) return;
    const updatedAssociations = editList.associations.map((a) =>
      selectedArchivedIds.has(a.id) ? { ...a, isArchived: false } : a,
    );
    cleanupAndSave({ ...editList, associations: updatedAssociations });
    setSelectedArchivedIds(new Set());
  }, [editList, selectedArchivedIds, cleanupAndSave]);

  const activeAssociations = editList.associations.filter((a) => !a.isArchived);
  const archivedAssociations = editList.associations.filter(
    (a) => a.isArchived,
  );

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    activeAssociations.forEach((a) => {
      a.metadata?.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [activeAssociations]);

  const filteredActive = activeAssociations.filter((assoc) => {
    const matchesSearch =
      assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assoc.definition
        .join("|")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesTag =
      !activeTagFilter || assoc.metadata?.tags?.includes(activeTagFilter);
    return matchesSearch && matchesTag;
  });

  const filteredArchived = archivedAssociations.filter(
    (assoc) =>
      assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assoc.definition
        .join("|")
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
  );

  const sortedActive = useMemo(
    () => sortAssociations(filteredActive, activeSort),
    [filteredActive, activeSort],
  );

  const sortedArchived = useMemo(
    () => sortAssociations(filteredArchived, archivedSort),
    [filteredArchived, archivedSort],
  );

  const autoOpenActiveId =
    initialEditId && activeAssociations.some((a) => a.id === initialEditId)
      ? initialEditId
      : null;
  const autoOpenArchivedId =
    initialEditId && archivedAssociations.some((a) => a.id === initialEditId)
      ? initialEditId
      : null;

  useEffect(() => {
    if (initialEditId) {
      onInitialEditConsumed?.();
    }
  }, [initialEditId, onInitialEditConsumed]);

  const hasName = editList.name.trim() !== "";

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <QuotaAlert status={quotaStatus} />
      {showValidationScreen && (
        <ValidationScreen
          validationResult={validationResult}
          onConfirmImport={importSelectedCards}
          onBack={handleBackToEditor}
          deckName={editList.name}
          showToast={showToast as (message: string, type?: string) => void}
        />
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
        {/* HEADER */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-[#fafcff]">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#dce2ea] bg-white text-[0.8rem] font-medium text-[#1f3347] hover:bg-[#f1f5f9] transition"
          >
            ← Volver al dashboard
          </button>
        </div>

        {/* DECK NAME SECTION */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="text-[0.65rem] font-semibold text-[#64748b] uppercase tracking-[0.06em] mb-1.5">
            📚 EDITANDO MAZO
          </div>
          <div
            className={`flex items-center gap-2 rounded-2xl px-4 py-1 transition ${
              hasName
                ? "border border-[#e2e8f0] bg-white"
                : nameError
                ? "border-2 border-rose-400 bg-rose-50/50"
                : "border-2 border-dashed border-[#dce2ea] bg-[#f8faff]"
            } focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10`}
          >
            <input
              id="list-name"
              type="text"
              value={editList.name}
              onChange={(e) => handleRename(e.target.value)}
              onBlur={handleRenameBlur}
              placeholder="Escribe un nombre para tu mazo..."
              className="flex-1 bg-transparent text-[1.3rem] font-semibold text-[#0b1a26] py-2.5 outline-none placeholder:text-[#94a3b8] placeholder:font-normal"
            />
            <span className="text-base text-[#94a3b8] opacity-0 hover:opacity-100 transition">
              ✏️
            </span>
          </div>
          <div
            className={`text-[0.7rem] mt-1.5 ${
              nameError ? "text-rose-600 font-medium" : "text-[#94a3b8]"
            }`}
          >
            {nameError
              ? "⚠️ Ponle un nombre a tu mazo para poder guardarlo"
              : "💡 Ponle un nombre para identificarlo fácilmente en tu dashboard"}
          </div>
        </div>

        {/* TOOLBAR */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <svg
                className="h-4 w-4 text-[#94a3b8]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Buscar tarjeta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3.5 py-2.5 border border-[#dce2ea] rounded-full text-[0.85rem] bg-[#fafcff] text-[#0b1a26] outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition"
            />
          </div>

          {selectedIds.size > 0 && (
            <>
              <select
                value={translateLang}
                onChange={(e) => setTranslateLang(e.target.value)}
                className="bg-white border border-indigo-200 text-indigo-700 px-3 py-2.5 rounded-full text-[0.7rem] font-bold outline-none"
              >
                <option value="es">🇪🇸 ES</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="de">🇩🇪 DE</option>
                <option value="pt">🇧🇷 PT</option>
              </select>
              <button
                onClick={handleTranslateSelected}
                disabled={isTranslating}
                className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider hover:border-indigo-600 transition disabled:opacity-50"
              >
                {isTranslating ? "Traduciendo..." : "Traducir"}
              </button>
              <button
                onClick={handleDeleteSelected}
                className="bg-white border border-rose-200 text-rose-700 px-4 py-2.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider hover:border-rose-600 transition"
              >
                Eliminar
              </button>
              <button
                onClick={handleExportSelected}
                className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider hover:border-emerald-600 transition"
              >
                Exportar
              </button>
            </>
          )}

          <button
            onClick={handleAddRow}
            disabled={!isPremium && quotaStatus?.level === "blocked"}
            className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-[0.8rem] font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            + Añadir tarjeta
          </button>
          <button
            onClick={() => setShowBulk(!showBulk)}
            className="px-5 py-2.5 rounded-full border border-[#dce2ea] bg-white text-[#1f3347] text-[0.8rem] font-medium hover:bg-[#f1f5f9] transition whitespace-nowrap"
          >
            📥 Importar
          </button>
        </div>

        {/* TAGS FILTER */}
        {uniqueTags.length > 0 && (
          <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/30 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTagFilter(null)}
              className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full transition ${
                activeTagFilter === null
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              Todos ({activeAssociations.length})
            </button>
            {uniqueTags.map((tag) => {
              const count = activeAssociations.filter((a) =>
                a.metadata?.tags?.includes(tag),
              ).length;
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setActiveTagFilter(activeTagFilter === tag ? null : tag)
                  }
                  className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full transition ${
                    activeTagFilter === tag
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {tag} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* BULK IMPORT */}
        {showBulk && <BulkImport onBulkAdd={handleBulkAdd} />}

        {/* IMPORT MODAL */}
        {showImportModal && (
          <CreateListForm
            newName={editList.name}
            setNewName={(v) => setEditList((c) => ({ ...c, name: v }))}
            newConcept={editList.concept || ""}
            setNewConcept={(v) => setEditList((c) => ({ ...c, concept: v }))}
            showBulk={false}
            importTab={"paste"}
            onCancel={() => {
              setShowImportModal(false);
            }}
            onSubmit={(_e: FormEvent) => {
              setShowImportModal(false);
              const saved = cleanupAndSave(editList);
              if (saved)
                showToast(
                  `Se guardaron los cambios a "${editList.name}"`,
                  "success",
                );
            }}
            maxCardsPerDeck={
              useGameStore.getState().settings?.maxCardsPerDeck ?? 50
            }
            totalCards={editList.associations.length}
          />
        )}

        {/* TRANSLATION QUOTA BAR */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/30">
            <div className="flex items-center gap-3 text-[10px]">
              <span
                className={`font-bold uppercase tracking-wider ${
                  translationState === "blocked"
                    ? "text-rose-600"
                    : translationState === "warning"
                    ? "text-amber-600"
                    : "text-slate-500"
                }`}
              >
                Traducción: {translationUsed.toLocaleString()} /{" "}
                {translationLimit.toLocaleString()} chars
              </span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    translationState === "blocked"
                      ? "bg-rose-500"
                      : translationState === "warning"
                      ? "bg-amber-500"
                      : "bg-indigo-400"
                  }`}
                  style={{ width: `${translationPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* MAIN TABLE */}
        <AssociationTable
          associations={sortedActive}
          sort={activeSort}
          onSort={(newSort) =>
            setActiveSort(nextSort(activeSort, newSort.field as SortField))
          }
          termHeader={termHeader}
          definitionHeader={definitionHeader}
          onUpdateField={handleUpdateField}
          onUpdateTags={handleUpdateTags}
          onBlurRow={handleBlurRow}
          onRemoveRow={handleRemoveRow}
          selectable
          autoOpenId={autoOpenActiveId}
          selectedIds={selectedIds}
          onToggleSelect={(id) => {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
        />

        {/* ARCHIVED */}
        {archivedAssociations.length > 0 && (
          <div className="pt-4 sm:pt-6">
            <div className="px-4 sm:px-8 pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">
                    Tarjetas Archivadas
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500">
                    Estas tarjetas ya no aparecen en tus partidas. Puedes
                    restaurarlas en cualquier momento.
                  </p>
                </div>
                {selectedArchivedIds.size > 0 && (
                  <button
                    onClick={handleRestoreSelected}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition shadow-sm"
                  >
                    Restaurar {selectedArchivedIds.size} seleccionado
                    {selectedArchivedIds.size > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            </div>
            <AssociationTable
              associations={sortedArchived}
              sort={archivedSort}
              onSort={(newSort) =>
                setArchivedSort(
                  nextSort(archivedSort, newSort.field as SortField),
                )
              }
              termHeader={termHeader}
              definitionHeader={definitionHeader}
              onUpdateField={handleUpdateField}
              onUpdateTags={handleUpdateTags}
              onBlurRow={handleBlurRow}
              onRemoveRow={handleRemoveRow}
              onRestoreRow={handleRestoreRow}
              isArchived
              selectable
              selectedIds={selectedArchivedIds}
              onToggleSelect={(id) => {
                setSelectedArchivedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              autoOpenId={autoOpenArchivedId}
            />
          </div>
        )}

        {/* FOOTER STICKY */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] flex justify-between items-center gap-3">
          <div className="text-[0.8rem] text-[#64748b]">
            📊{" "}
            <span className="font-bold text-[#0b1a26] text-base">
              {editList.associations.length}
            </span>{" "}
            tarjetas
          </div>
          <button
            type="button"
            onClick={() => {
              if (!editList.name.trim()) {
                setNameError(true);
                document.getElementById("list-name")?.focus();
                showToast(
                  "⚠️ Ponle un nombre a tu mazo antes de guardar.",
                  "error",
                );
                return;
              }
              handleSave();
            }}
            disabled={isSaving}
            className={`flex items-center gap-1.5 px-6 py-2.5 rounded-full font-semibold text-[0.8rem] transition shadow-md ${
              isSaving
                ? "bg-emerald-600 text-white cursor-wait"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {isSaving ? "✅ Guardando..." : "💾 Guardar mazo"}
          </button>
        </div>
      </div>

      {aiSuggestions && (
        <SmartGroupModal
          originalList={editList}
          suggestions={aiSuggestions}
          onCancel={() => setAiSuggestions(null)}
          onConfirm={(groups) => {
            if (onCreateMultiple) onCreateMultiple(groups);
            setAiSuggestions(null);
            onBack();
          }}
        />
      )}
    </div>
  );
};
