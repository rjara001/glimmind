import { useState, useEffect, useCallback, useMemo } from "react";
import type { AssociationList } from "../../types";
import { useGameStore } from "../../store/gameStore";

export interface ListEditorState {
  editList: AssociationList;
  setEditList: (list: AssociationList) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  activeTagFilter: string | null;
  setActiveTagFilter: (filter: string | null) => void;
  selectedIds: Set<string>;
  setSelectedIds: (ids: Set<string>) => void;
  showBulk: boolean;
  setShowBulk: (show: boolean) => void;
  isTranslating: boolean;
  setIsTranslating: (show: boolean) => void;
  translateLang: string;
  setTranslateLang: (lang: string) => void;
  isSaving: boolean;
  setIsSaving: (saving: boolean) => void;
}

export function useInitialState(list: AssociationList): ListEditorState {
  const [editList, setEditList] = useState<AssociationList>(list);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulk, setShowBulk] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState('es');
  const [isSaving, setIsSaving] = useState(false);

  return {
    editList,
    setEditList,
    searchTerm,
    setSearchTerm,
    activeTagFilter,
    setActiveTagFilter,
    selectedIds,
    setSelectedIds,
    showBulk,
    setShowBulk,
    isTranslating,
    setIsTranslating,
    translateLang,
    setTranslateLang,
    isSaving,
    setIsSaving,
  };
}