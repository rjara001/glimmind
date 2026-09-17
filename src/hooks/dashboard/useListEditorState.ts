import { useState, useMemo } from "react";
import type { Association, AssociationList } from "../../types";
import type { ImportValidationResult } from "../../services/importValidationService";
import type { AIGroupSuggestion } from "../../services/aiService";
import type { QuotaStatus } from "../../types/quota";
import { useGameStore } from "../../store/gameStore";
import { QuotaService } from "../../services/quotaService";

export interface TableSort {
  field: "term" | "definition";
  direction: "asc" | "desc";
}

export interface ListEditorState {
  editList: AssociationList;
  setEditList: React.Dispatch<React.SetStateAction<AssociationList>>;
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
  activeSort: TableSort | null;
  setActiveSort: React.Dispatch<React.SetStateAction<TableSort | null>>;
  archivedSort: TableSort | null;
  setArchivedSort: React.Dispatch<React.SetStateAction<TableSort | null>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedArchivedIds: Set<string>;
  setSelectedArchivedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  isTranslating: boolean;
  setIsTranslating: React.Dispatch<React.SetStateAction<boolean>>;
  translateLang: string;
  setTranslateLang: React.Dispatch<React.SetStateAction<string>>;
  activeTagFilter: string | null;
  setActiveTagFilter: React.Dispatch<React.SetStateAction<string | null>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  showBulk: boolean;
  setShowBulk: React.Dispatch<React.SetStateAction<boolean>>;
  showImportModal: boolean;
  setShowImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  validationResult: ImportValidationResult | null;
  setValidationResult: React.Dispatch<React.SetStateAction<ImportValidationResult | null>>;
  showValidationScreen: boolean;
  setShowValidationScreen: React.Dispatch<React.SetStateAction<boolean>>;
  nameError: boolean;
  setNameError: React.Dispatch<React.SetStateAction<boolean>>;
  aiSuggestions: AIGroupSuggestion[] | null;
  setAiSuggestions: React.Dispatch<React.SetStateAction<AIGroupSuggestion[] | null>>;
  termHeader: string;
  definitionHeader: string;
  contextHeader: string;
  csvHeader: [string, string, string];
  projectedTotal: number;
  quotaStatus: QuotaStatus | null;
  translationUsed: number;
  setTranslationUsed: React.Dispatch<React.SetStateAction<number>>;
  translationLimit: number;
  translationPercentage: number;
  translationState: "ok" | "warning" | "blocked";
  uniqueTags: string[];
  activeAssociations: Association[];
  archivedAssociations: Association[];
  filteredActive: Association[];
  filteredArchived: Association[];
  sortedActive: Association[];
  sortedArchived: Association[];
  autoOpenActiveId: string | null;
  autoOpenArchivedId: string | null;
  hasName: boolean;
  isImporting: boolean;
  setIsImporting: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useListEditorState(
  initialList: AssociationList,
  initialEditId: string | null
): ListEditorState {
  const quota = useGameStore((state) => state.quota);
  const lists = useGameStore((state) => state.lists);

  const [editList, setEditList] = useState<AssociationList>(initialList);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSort, setActiveSort] = useState<TableSort | null>(null);
  const [archivedSort, setArchivedSort] = useState<TableSort | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState("es");
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [showValidationScreen, setShowValidationScreen] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIGroupSuggestion[] | null>(null);
  const [translationUsed, setTranslationUsed] = useState(() => quota?.translationCharsUsed ?? 0);
  const [isImporting, setIsImporting] = useState(false);

  const conceptParts = editList.concept.split("/");
  const termHeader = conceptParts[0] || "Term";
  const definitionHeader = conceptParts[1] || "Definition";
  const contextHeader = conceptParts[2] || "Context";
  const csvHeader: [string, string, string] = [termHeader, definitionHeader, contextHeader];

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

  const activeAssociations = useMemo(
    () => editList.associations.filter((a) => !a.isArchived),
    [editList]
  );

  const archivedAssociations = useMemo(
    () => editList.associations.filter((a) => a.isArchived),
    [editList]
  );

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    activeAssociations.forEach((a) => {
      a.metadata?.tags?.forEach((t) => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [activeAssociations]);

  const filteredActive = useMemo(() => {
    return activeAssociations.filter((assoc) => {
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
  }, [activeAssociations, searchTerm, activeTagFilter]);

  const filteredArchived = useMemo(() => {
    return archivedAssociations.filter(
      (assoc) =>
        assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assoc.definition
          .join("|")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
    );
  }, [archivedAssociations, searchTerm]);

  const sortedActive = useMemo(
    () => sortAssociations(filteredActive, activeSort),
    [filteredActive, activeSort]
  );

  const sortedArchived = useMemo(
    () => sortAssociations(filteredArchived, archivedSort),
    [filteredArchived, archivedSort]
  );

  const autoOpenActiveId =
    initialEditId && activeAssociations.some((a) => a.id === initialEditId)
      ? initialEditId
      : null;
  const autoOpenArchivedId =
    initialEditId && archivedAssociations.some((a) => a.id === initialEditId)
      ? initialEditId
      : null;

  const hasName = editList.name.trim() !== "";

  return {
    editList,
    setEditList,
    searchTerm,
    setSearchTerm,
    activeSort,
    setActiveSort,
    archivedSort,
    setArchivedSort,
    selectedIds,
    setSelectedIds,
    selectedArchivedIds,
    setSelectedArchivedIds,
    isTranslating,
    setIsTranslating,
    translateLang,
    setTranslateLang,
    activeTagFilter,
    setActiveTagFilter,
    isSaving,
    setIsSaving,
    showBulk,
    setShowBulk,
    showImportModal,
    setShowImportModal,
    validationResult,
    setValidationResult,
    showValidationScreen,
    setShowValidationScreen,
    nameError,
    setNameError,
    aiSuggestions,
    setAiSuggestions,
    termHeader,
    definitionHeader,
    contextHeader,
    csvHeader,
    projectedTotal,
    quotaStatus,
    translationUsed,
    translationLimit,
    translationPercentage,
    translationState,
    uniqueTags,
    activeAssociations,
    archivedAssociations,
    filteredActive,
    filteredArchived,
    sortedActive,
    sortedArchived,
    autoOpenActiveId,
    autoOpenArchivedId,
    hasName,
    setTranslationUsed,
    isImporting,
    setIsImporting,
  };
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