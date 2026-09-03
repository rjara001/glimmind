import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AssociationList, Association } from '../types';
import { aiService, AIGroupSuggestion } from '../services/aiService';
import { normalizeAssociations, AssociationLike, parseDefinitions } from '../utils/normalizeAssociation';
import { SmartGroupModal } from '../components/modals/SmartGroupModal';
import { useGameStore } from '../store/gameStore';
import { QuotaService } from '../services/quotaService';
import { downloadAssociationsCsv, parseForPreview } from '../utils/csv';
import { useToast } from '../components/layout/Toast';
import { QuotaAlert } from '../components/layout/QuotaAlert';
import { MIN_GROUP_SIZE } from '../constants/limits';
import { AssociationTable } from '../components/list-editor/AssociationTable';
import { BulkImport } from '../components/list-editor/BulkImport';
import { translationService } from '../services/translationService';

type SortField = 'term' | 'definition';

interface TableSort {
  field: SortField;
  direction: 'asc' | 'desc';
}

function nextSort(current: TableSort | null, field: SortField): TableSort {
  if (current && current.field === field) {
    return { field, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { field, direction: 'asc' };
}

function sortAssociations(associations: Association[], tableSort: TableSort | null): Association[] {
  if (!tableSort) return associations;
  const { field, direction } = tableSort;
  return [...associations].sort((a, b) => {
    const aValue = (field === 'definition' ? a.definition.join('|') : a.term).toLowerCase();
    const bValue = (field === 'definition' ? b.definition.join('|') : b.term).toLowerCase();
    const comparison = aValue.localeCompare(bValue);
    return direction === 'asc' ? comparison : -comparison;
  });
}

function deduplicateAssociations(existing: Association[], incoming: Association[]): Association[] {
  const existingKeys = new Set(existing.map(a => `${a.term}|||${a.definition.join('|')}`));
  return incoming.filter(a => !existingKeys.has(`${a.term}|||${a.definition.join('|')}`));
}

interface ListEditorProps {
  list: AssociationList;
  initialEditId?: string | null;
  onInitialEditConsumed?: () => void;
  onSave: (list: AssociationList) => Promise<void> | void;
  onBack: () => void;
  onBackLabel?: string;
  onCreateMultiple?: (groups: { name: string, associations: Association[] }[]) => void;
}

export const ListEditor: React.FC<ListEditorProps> = ({ list, initialEditId, onInitialEditConsumed, onSave, onBack, onBackLabel = 'Volver al dashboard', onCreateMultiple }) => {
  const { showToast } = useToast();
  const [showBulk, setShowBulk] = useState(false);
  const [editList, setEditList] = useState<AssociationList>(list);
  const [searchTerm, setSearchTerm] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AIGroupSuggestion[] | null>(null);
  const [activeSort, setActiveSort] = useState<TableSort | null>(null);
  const [archivedSort, setArchivedSort] = useState<TableSort | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState('es');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const pendingSaveRef = useRef<Promise<void> | null>(null);

  const conceptParts = editList.concept.split('/');
  const termHeader = conceptParts[0] || 'Term';
  const definitionHeader = conceptParts[1] || 'Definition';
  const contextHeader = conceptParts[2] || 'Context';
  const csvHeader: [string, string, string] = [termHeader, definitionHeader, contextHeader];

  const quota = useGameStore(state => state.quota);
  const lists = useGameStore(state => state.lists);
  const isPremium = quota?.tier === 'premium';

  const [translationUsed, setTranslationUsed] = useState(() => quota?.translationCharsUsed ?? 0);
  const translationLimit = quota?.translationCharLimit ?? 20000;
  const translationPercentage = Math.min(100, (translationUsed / translationLimit) * 100);
  const translationState = translationPercentage >= 100 ? 'blocked' : translationPercentage >= 70 ? 'warning' : 'ok';

  useEffect(() => {
    setTranslationUsed(quota?.translationCharsUsed ?? 0);
  }, [quota?.translationCharsUsed]);

  const projectedTotal = useMemo(() => {
    const otherTotal = lists
      .filter(l => l.id !== editList.id)
      .reduce((sum, l) => sum + (l.associations?.length || 0), 0);
    return otherTotal + editList.associations.length;
  }, [lists, editList]);

  const quotaStatus = useMemo(() => {
    if (!quota) return null;
    return QuotaService.getStatus(projectedTotal, quota.tier);
  }, [quota, projectedTotal]);

  const cleanupAndSave = useCallback((listToSave: AssociationList): boolean => {
    const seenIds = new Set<string>();
    const cleanedAssociations = normalizeAssociations(listToSave.associations)
      .map(assoc => {
        const term = assoc.term.trim();
        const id = !assoc.id || seenIds.has(assoc.id) ? crypto.randomUUID() : assoc.id;
        seenIds.add(id);
        return { ...assoc, id, term };
      })
      .filter(assoc => assoc.term.trim() !== '' || assoc.definition.some((d) => d.trim() !== ''));

    const { quota, lists } = useGameStore.getState();
    const tier = quota?.tier || 'free';
    const currentCards = lists.reduce((sum, l) => sum + (l.associations?.length || 0), 0);
    const status = QuotaService.getStatus(currentCards, tier);
    
    if (status.level === 'blocked') {
      showToast(`Llegaste a tu límite de ${status.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`, 'error');
      return false;
    }

    const storedList = lists.find(l => l.id === listToSave.id);
    const storedCount = storedList?.associations?.length ?? listToSave.associations.length;
    const growing = cleanedAssociations.length > storedCount;
    if (growing) {
      const otherTotal = lists
        .filter(l => l.id !== listToSave.id)
        .reduce((sum, l) => sum + (l.associations?.length || 0), 0);
      const projected = otherTotal + cleanedAssociations.length;
      const projectedStatus = QuotaService.getStatus(projected, tier);
      if (projectedStatus.level === 'blocked') {
        showToast(`Llegaste a tu límite de ${projectedStatus.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`, 'error');
        return false;
      }
      if (projectedStatus.level === 'danger') {
        showToast(`Te quedan solo ${projectedStatus.remainingCards} tarjetas disponibles`, 'error');
      }
    }

    const updatedList = { ...listToSave, associations: cleanedAssociations };
    setEditList(updatedList);
    pendingSaveRef.current = Promise.resolve(onSave(updatedList));
    showToast('Lista guardada', 'success');
    return true;
  }, [onSave]);

  const handleBack = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const saved = cleanupAndSave(editList);
      if (saved && pendingSaveRef.current) {
        await pendingSaveRef.current;
      }
    } finally {
      setIsSaving(false);
    }
    onBack();
  }, [cleanupAndSave, editList, isSaving, onBack]);

  useEffect(() => {
    const initialAssociations = list.associations;
    let needsCleanup = false;
    const seenIds = new Set<string>();
    for (const assoc of initialAssociations) {
      const definitionClean = assoc.definition.length > 0 && assoc.definition.every((d) => d.trim() === d);
      const emptyCard = assoc.term.trim() === '' && assoc.definition.every((d) => d.trim() === '');
      if (!assoc.id || seenIds.has(assoc.id) || assoc.term.trim() !== assoc.term || !definitionClean || emptyCard) {
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
    const { quota } = useGameStore.getState();
    const tier = quota?.tier || 'free';
    const status = QuotaService.getStatus(lists.reduce((sum, l) => sum + (l.associations?.length || 0), 0), tier);
    if (status.level === 'blocked') {
      showToast(`Llegaste a tu límite de ${status.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`, 'error');
      return;
    }
    const preview = parseForPreview(text);
    const newAssocs: Association[] = normalizeAssociations(preview.rows.map<AssociationLike>(triple => ({
      id: crypto.randomUUID(),
      term: triple.value1,
      definition: triple.value2,
      context: triple.context,
      currentCycle: 1,
      status: 'pending' as const,
      isLearned: false,
      isArchived: false,
    })));
    const uniqueNewAssocs = deduplicateAssociations(editList.associations, newAssocs);
    const skippedCount = newAssocs.length - uniqueNewAssocs.length;
    const saved = cleanupAndSave({ ...editList, associations: [...editList.associations, ...uniqueNewAssocs] });
    if (saved) {
      setShowBulk(false);
      const message = skippedCount > 0
        ? `Se importaron ${uniqueNewAssocs.length} tarjetas (${skippedCount} duplicadas omitidas).`
        : `Se importaron ${uniqueNewAssocs.length} tarjetas.`;
      showToast(message, 'success');
    }
  };

  const handleSmartSplit = async () => {
    const activeAssociations = editList.associations.filter(a => !a.isArchived);
    if (activeAssociations.length < MIN_GROUP_SIZE) {
      alert(`Necesitas al menos ${MIN_GROUP_SIZE} elementos para encontrar patrones lógicos.`);
      return;
    }
    setIsAnalyzing(true);
    try {
      const suggestions = await aiService.groupAssociations(activeAssociations, editList.concept);
      setAiSuggestions(suggestions);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocurrió un error inesperado al organizar la lista.';
      alert(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRename = useCallback((value: string) => {
    setEditList((current) => ({ ...current, name: value }));
  }, []);

  const handleRenameBlur = useCallback(() => {
    cleanupAndSave(editList);
  }, [cleanupAndSave, editList]);

  const handleAddRow = () => {
    const { quota } = useGameStore.getState();
    const tier = quota?.tier || 'free';
    const status = QuotaService.getStatus(lists.reduce((sum, l) => sum + (l.associations?.length || 0), 0), tier);
    if (status.level === 'blocked') {
      showToast(`Llegaste a tu límite de ${status.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`, 'error');
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
  };

  const handleUpdateField = (id: string, field: keyof Association, value: string) => {
    setEditList(current => {
      const nextValue = field === 'definition' ? parseDefinitions(value) : value;
      const updatedAssociations = current.associations.map(a => a.id === id ? { ...a, [field]: nextValue } : a);
      return { ...current, associations: updatedAssociations };
    });
  };

  const handleUpdateTags = (id: string, tags: string[]) => {
    setEditList(current => {
      const updatedAssociations = current.associations.map((a) => {
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
  };

  const handleBlurRow = () => {
    cleanupAndSave(editList);
  };

  const handleRemoveRow = (id: string) => {
    const updated = { ...editList, associations: editList.associations.filter(a => a.id !== id) };
    cleanupAndSave(updated);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleTranslateSelected = useCallback(async () => {
    const selectedAssociations = editList.associations.filter(a => selectedIds.has(a.id));
    if (selectedAssociations.length === 0) return;

    const user = useGameStore.getState().user;
    if (!user) {
      showToast('Debes iniciar sesión para traducir.', 'error');
      return;
    }

    setIsTranslating(true);
    try {
      const cards = selectedAssociations.map(a => ({ term: a.term, context: a.context }));
      const response = await translationService.translateBatch(user.uid, cards, translateLang);

      const updatedAssociations = editList.associations.map(a => {
        if (!selectedIds.has(a.id)) return a;
        const translation = response.translations.find(t => t.original === a.term);
        const translatedText = translation ? translation.translated : a.translation;
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
        showToast('Se agotó la cuota de traducción.', 'error');
      } else {
        setTranslationUsed(prev => prev + response.consumedChars);
        const remaining = response.userRemainingChars;
        showToast(`Traducidas ${response.translations.length} tarjetas. Quedan ${remaining} caracteres.`, 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al traducir.', 'error');
    } finally {
      setIsTranslating(false);
    }
  }, [editList, selectedIds, onSave, showToast, translateLang]);

  const handleExportSelected = useCallback(() => {
    const selectedAssociations = editList.associations.filter(a => selectedIds.has(a.id));
    if (selectedAssociations.length === 0) return;
    const fileName = `${editList.name.replace(/[^a-zA-Z0-9]/g, '_')}_export.csv`;
    downloadAssociationsCsv(selectedAssociations, fileName, csvHeader);
    showToast(`Exportadas ${selectedAssociations.length} tarjetas`, 'success');
  }, [editList, selectedIds, csvHeader, showToast]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    const updated = { ...editList, associations: editList.associations.filter(a => !selectedIds.has(a.id)) };
    cleanupAndSave(updated);
    setSelectedIds(new Set());
  }, [editList, selectedIds, cleanupAndSave]);

  const handleRestoreRow = (id: string) => {
    const updatedAssociations = editList.associations.map(a => a.id === id ? { ...a, isArchived: false } : a);
    cleanupAndSave({ ...editList, associations: updatedAssociations });
  };

  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(new Set());

  const handleRestoreSelected = useCallback(() => {
    if (selectedArchivedIds.size === 0) return;
    const updatedAssociations = editList.associations.map(a =>
      selectedArchivedIds.has(a.id) ? { ...a, isArchived: false } : a
    );
    cleanupAndSave({ ...editList, associations: updatedAssociations });
    setSelectedArchivedIds(new Set());
  }, [editList, selectedArchivedIds, cleanupAndSave]);

  const activeAssociations = editList.associations.filter(a => !a.isArchived);
  const archivedAssociations = editList.associations.filter(a => a.isArchived);

  const uniqueTags = useMemo(() => {
    const tagSet = new Set<string>();
    activeAssociations.forEach(a => {
      a.metadata?.tags?.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [activeAssociations]);

  const filteredActive = activeAssociations.filter(assoc => {
    const matchesSearch = assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assoc.definition.join('|').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !activeTagFilter || assoc.metadata?.tags?.includes(activeTagFilter);
    return matchesSearch && matchesTag;
  });

  const filteredArchived = archivedAssociations.filter(assoc =>
    assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.definition.join('|').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedActive = useMemo(
    () => sortAssociations(filteredActive, activeSort),
    [filteredActive, activeSort]
  );

  const sortedArchived = useMemo(
    () => sortAssociations(filteredArchived, archivedSort),
    [filteredArchived, archivedSort]
  );

  const autoOpenActiveId = initialEditId && activeAssociations.some(a => a.id === initialEditId) ? initialEditId : null;
  const autoOpenArchivedId = initialEditId && archivedAssociations.some(a => a.id === initialEditId) ? initialEditId : null;

  useEffect(() => {
    if (initialEditId) {
      onInitialEditConsumed?.();
    }
  }, [initialEditId, onInitialEditConsumed]);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <QuotaAlert status={quotaStatus} />

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 pt-6 pb-0 flex items-start gap-3">
          <button
            type="button"
            onClick={handleBack}
            title={onBackLabel}
            className="mt-1 flex-shrink-0 p-2 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition bg-white"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <label htmlFor="list-name" className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Nombre del mazo
              </label>
              <button
                type="button"
                onClick={handleBack}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                {onBackLabel} →
              </button>
            </div>
            <input
              id="list-name"
              type="text"
              value={editList.name}
              onChange={(e) => handleRename(e.target.value)}
              onBlur={handleRenameBlur}
              className="w-full text-xl font-bold text-slate-800 bg-transparent border border-dashed border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition hover:border-slate-300"
            />
          </div>
        </div>
        <div className="p-4 sm:p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4 mt-4">
          <div className="relative flex-1 w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
              <svg className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Filter..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition outline-none shadow-sm"
            />
          </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {selectedIds.size > 0 && (
            <>
              <select
                value={translateLang}
                onChange={(e) => setTranslateLang(e.target.value)}
                className="bg-white border border-indigo-200 text-indigo-700 px-2 sm:px-3 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
              >
                <option value="es">🇪🇸 ES</option>
                <option value="fr">🇫🇷 FR</option>
                <option value="de">🇩🇪 DE</option>
                <option value="pt">🇧🇷 PT</option>
              </select>
              <button
                onClick={handleTranslateSelected}
                disabled={isTranslating}
                title="Traducir seleccionados"
                className="bg-white border border-indigo-200 text-indigo-700 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition flex-1 sm:flex-none shadow-sm disabled:opacity-50"
              >
                {isTranslating ? 'Traduciendo...' : 'Traducir'}
              </button>
              <button
                onClick={handleDeleteSelected}
                title="Eliminar seleccionados"
                className="bg-white border border-rose-200 text-rose-700 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:border-rose-600 hover:text-rose-600 transition flex-1 sm:flex-none shadow-sm"
              >
                Eliminar
              </button>
              <button
                onClick={handleExportSelected}
                title="Exportar seleccionados a CSV"
                className="bg-white border border-emerald-200 text-emerald-700 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:border-emerald-600 hover:text-emerald-600 transition flex-1 sm:flex-none shadow-sm"
              >
                Exportar
              </button>
            </>
          )}
          <button
            onClick={() => setShowBulk(!showBulk)}
            className="px-3 sm:px-4 py-2 sm:py-3 text-indigo-600 text-[10px] sm:text-xs font-black uppercase tracking-widest hover:bg-white rounded-xl transition"
          >
            <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            <span className="hidden sm:inline">Import</span>
          </button>
          <button
            onClick={handleAddRow}
            disabled={!isPremium && quotaStatus?.level === 'blocked'}
            className="bg-white border border-slate-200 text-slate-700 px-3 sm:px-6 py-2 sm:py-3 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest hover:border-indigo-600 hover:text-indigo-600 transition flex-1 sm:flex-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4 sm:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="hidden sm:inline">Add Row</span>
          </button>
        </div>
        </div>

        {uniqueTags.length > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b bg-slate-50/30 flex flex-wrap gap-1.5">
            <button
              onClick={() => setActiveTagFilter(null)}
              className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full transition ${
                activeTagFilter === null
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              Todos ({activeAssociations.length})
            </button>
            {uniqueTags.map(tag => {
              const count = activeAssociations.filter(a => a.metadata?.tags?.includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                  className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full transition ${
                    activeTagFilter === tag
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {tag} ({count})
                </button>
              );
            })}
          </div>
        )}

        {showBulk && (
          <BulkImport
            onBulkAdd={handleBulkAdd}
          />
        )}

        {selectedIds.size > 0 && (
          <div className="px-4 sm:px-6 py-2 border-b bg-slate-50/30">
            <div className="flex items-center gap-3 text-[10px]">
              <span className={`font-bold uppercase tracking-wider ${
                translationState === 'blocked' ? 'text-rose-600' :
                translationState === 'warning' ? 'text-amber-600' : 'text-slate-500'
              }`}>
                Traducción: {translationUsed.toLocaleString()} / {translationLimit.toLocaleString()} chars
              </span>
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    translationState === 'blocked' ? 'bg-rose-500' :
                    translationState === 'warning' ? 'bg-amber-500' : 'bg-indigo-400'
                  }`}
                  style={{ width: `${translationPercentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        <AssociationTable
          associations={sortedActive}
          sort={activeSort}
          onSort={(newSort) => setActiveSort(nextSort(activeSort, newSort.field as SortField))}
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
              if (next.has(id)) {
                next.delete(id);
              } else {
                next.add(id);
              }
              return next;
            });
          }}
        />

        {archivedAssociations.length > 0 && (
          <div className="pt-4 sm:pt-6">
            <div className="px-4 sm:px-8 pb-3 sm:pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800">Tarjetas Archivadas</h3>
                  <p className="text-xs sm:text-sm text-slate-500">Estas tarjetas ya no aparecen en tus partidas. Puedes restaurarlas en cualquier momento.</p>
                </div>
                {selectedArchivedIds.size > 0 && (
                  <button
                    onClick={handleRestoreSelected}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition shadow-sm"
                  >
                    Restaurar {selectedArchivedIds.size} seleccionado{selectedArchivedIds.size > 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
            <AssociationTable
              associations={sortedArchived}
              sort={archivedSort}
              onSort={(newSort) => setArchivedSort(nextSort(archivedSort, newSort.field as SortField))}
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
                  if (next.has(id)) {
                    next.delete(id);
                  } else {
                    next.add(id);
                  }
                  return next;
                });
              }}
              autoOpenId={autoOpenArchivedId}
            />
          </div>
        )}
      </div>

      {aiSuggestions && <SmartGroupModal originalList={editList} suggestions={aiSuggestions} onCancel={() => setAiSuggestions(null)} onConfirm={(groups) => { if (onCreateMultiple) onCreateMultiple(groups); setAiSuggestions(null); onBack(); }} />}
    </div>
  );
};
