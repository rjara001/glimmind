import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { AssociationList, Association } from '../types';
import { aiService, AIGroupSuggestion } from '../services/aiService';
import { flattenAssociations } from '../utils/flattenAssociations';
import { SmartGroupModal } from '../components/modals/SmartGroupModal';
import { useGameStore } from '../store/gameStore';
import { computeQuotaStatus } from '../utils/quota';
import { downloadAssociationsCsv, parseCsvPairs, isHeaderPair } from '../utils/csv';
import { useToast } from '../components/layout/Toast';
import { MIN_GROUP_SIZE } from '../constants/limits';
import { AssociationTable, ColumnKey } from '../components/list-editor/AssociationTable';
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
    const aValue = a[field].toLowerCase();
    const bValue = b[field].toLowerCase();
    const comparison = aValue.localeCompare(bValue);
    return direction === 'asc' ? comparison : -comparison;
  });
}

function deduplicateAssociations(existing: Association[], incoming: Association[]): Association[] {
  const existingKeys = new Set(existing.map(a => `${a.term}|||${a.definition}`));
  return incoming.filter(a => !existingKeys.has(`${a.term}|||${a.definition}`));
}

interface ListEditorProps {
  list: AssociationList;
  onSave: (list: AssociationList) => void;
  onBack: () => void;
  onCreateMultiple?: (groups: { name: string, associations: Association[] }[]) => void;
}

export const ListEditor: React.FC<ListEditorProps> = ({ list, onSave, onBack, onCreateMultiple }) => {
  const { showToast } = useToast();
  const [showBulk, setShowBulk] = useState(false);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [editList, setEditList] = useState<AssociationList>(list);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIGroupSuggestion[] | null>(null);
  const [activeSort, setActiveSort] = useState<TableSort | null>(null);
  const [archivedSort, setArchivedSort] = useState<TableSort | null>(null);
  const [columnPriority, setColumnPriority] = useState<'term' | 'definition'>('term');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState('es');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [activeColumn, setActiveColumn] = useState<ColumnKey>('value1');

  const conceptParts = editList.concept.split('/');
  const termHeader = conceptParts[0] || 'Term';
  const definitionHeader = conceptParts[1] || 'Definition';
  const csvHeader: [string, string] = [termHeader, definitionHeader];

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
    return computeQuotaStatus(projectedTotal, quota.cardQuota);
  }, [quota, projectedTotal]);

  const cleanupAndSave = useCallback((listToSave: AssociationList): boolean => {
    const seenIds = new Set<string>();
    const flattenedAssociations = flattenAssociations(listToSave.associations);
    const cleanedAssociations = flattenedAssociations
      .map(assoc => {
        const term = assoc.term.trim();
        const definition = assoc.definition.trim();
        let id = assoc.id;
        if (!id || seenIds.has(id)) {
          id = crypto.randomUUID();
        }
        seenIds.add(id);
        return { ...assoc, id, term, definition };
      })
      .filter(assoc => assoc.term !== '' || assoc.definition !== '');

    const { quota, lists } = useGameStore.getState();
    const isPremium = quota?.tier === 'premium';
    if (!isPremium && quota) {
      const storedList = lists.find(l => l.id === listToSave.id);
      const storedCount = storedList?.associations?.length ?? listToSave.associations.length;
      const growing = cleanedAssociations.length > storedCount;
      if (growing) {
        const otherTotal = lists
          .filter(l => l.id !== listToSave.id)
          .reduce((sum, l) => sum + (l.associations?.length || 0), 0);
        const projected = otherTotal + cleanedAssociations.length;
        if (computeQuotaStatus(projected, quota.cardQuota).state === 'blocked') {
          alert(`Llegaste a tu límite de ${quota.cardQuota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
          return false;
        }
      }
    }

    const updatedList = { ...listToSave, associations: cleanedAssociations };
    setEditList(updatedList);
    onSave(updatedList);
    return true;
  }, [onSave]);

  useEffect(() => {
    const initialAssociations = list.associations;
    let needsCleanup = false;
    const seenIds = new Set<string>();
    for (const assoc of initialAssociations) {
      if (!assoc.id || seenIds.has(assoc.id) || assoc.term.trim() !== assoc.term || assoc.definition.trim() !== assoc.definition || (assoc.term.trim() === '' && assoc.definition.trim() === '')) {
        needsCleanup = true;
        break;
      }
      seenIds.add(assoc.id);
    }
    if (needsCleanup) {
      cleanupAndSave(list);
    }
  }, [list, cleanupAndSave]);

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    if (!isPremium && quotaStatus?.state === 'blocked') {
      alert(`Llegaste a tu límite de ${quotaStatus.quota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
      return;
    }
    const pairs = parseCsvPairs(bulkText);
    const newAssocs: Association[] = pairs.map(pair => ({
      id: crypto.randomUUID(),
      term: pair.term,
      definition: pair.definition,
      currentCycle: 1,
      status: 'pending' as const,
      isLearned: false,
      isArchived: false,
    }));
    const uniqueNewAssocs = deduplicateAssociations(editList.associations, newAssocs);
    const skippedCount = newAssocs.length - uniqueNewAssocs.length;
    const saved = cleanupAndSave({ ...editList, associations: [...editList.associations, ...uniqueNewAssocs] });
    if (saved) {
      setBulkText('');
      setShowBulk(false);
      const message = skippedCount > 0
        ? `Se importaron ${uniqueNewAssocs.length} tarjetas (${skippedCount} duplicadas omitidas).`
        : `Se importaron ${uniqueNewAssocs.length} tarjetas.`;
      showToast(message, 'success');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isPremium && quotaStatus?.state === 'blocked') {
      alert(`Llegaste a tu límite de ${quotaStatus.quota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
      return;
    }
    setSelectedFileName(file.name);
    setIsReadingFile(true);
    try {
      const content = await file.text();
      const pairs = parseCsvPairs(content);
      const skippedHeader = pairs.length > 0 && isHeaderPair(pairs[0], termHeader, definitionHeader);
      const dataPairs = skippedHeader ? pairs.slice(1) : pairs;
      if (dataPairs.length === 0) {
        alert('El archivo no contiene tarjetas válidas.');
        return;
      }
      const newAssocs: Association[] = dataPairs.map(pair => ({
        id: crypto.randomUUID(),
        term: pair.term,
        definition: pair.definition,
        currentCycle: 1,
        status: 'pending' as const,
        isLearned: false,
        isArchived: false,
      }));
      const uniqueNewAssocs = deduplicateAssociations(editList.associations, newAssocs);
      const skippedCount = newAssocs.length - uniqueNewAssocs.length;
      const saved = cleanupAndSave({ ...editList, associations: [...editList.associations, ...uniqueNewAssocs] });
      if (saved) {
        const message = skippedCount > 0
          ? `Se importaron ${uniqueNewAssocs.length} tarjetas de "${file.name}" (${skippedCount} duplicadas omitidas).`
          : `Se importaron ${uniqueNewAssocs.length} tarjetas de "${file.name}"`;
        showToast(message, 'success');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo leer el archivo.';
      alert(`No se pudo importar el archivo: ${message}`);
    } finally {
      setIsReadingFile(false);
      if (event.target) {
        event.target.value = '';
      }
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

  const handleAddRow = () => {
    if (!isPremium && quotaStatus?.state === 'blocked') {
      alert(`Llegaste a tu límite de ${quotaStatus.quota} tarjetas. Elimina o archiva tarjetas para añadir más.`);
      return;
    }
    const newAssociation: Association = {
      id: crypto.randomUUID(),
      term: '',
      definition: '',
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    };
    setEditList(current => ({ ...current, associations: [newAssociation, ...current.associations] }));
  };

  const handleUpdateField = (id: string, field: keyof Association, value: string) => {
    setEditList(current => {
      const updatedAssociations = current.associations.map(a => a.id === id ? { ...a, [field]: value } : a);
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
        return {
          ...a,
          translation: translation ? translation.translated : a.translation,
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
      assoc.definition.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = !activeTagFilter || assoc.metadata?.tags?.includes(activeTagFilter);
    return matchesSearch && matchesTag;
  });

  const filteredArchived = archivedAssociations.filter(assoc =>
    assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedActive = useMemo(
    () => sortAssociations(filteredActive, activeSort),
    [filteredActive, activeSort]
  );

  const sortedArchived = useMemo(
    () => sortAssociations(filteredArchived, archivedSort),
    [filteredArchived, archivedSort]
  );

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => { cleanupAndSave(editList); onBack(); }} className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{editList.name}</h2>
            <p className="text-sm text-gray-500">{activeAssociations.length} tarjetas activas • {archivedAssociations.length} archivadas</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSmartSplit}
            disabled={isAnalyzing || activeAssociations.length < MIN_GROUP_SIZE}
            title={activeAssociations.length < MIN_GROUP_SIZE ? `Añade al menos ${MIN_GROUP_SIZE} tarjetas para usar esta función` : "Organizar tarjetas en grupos lógicos"}
            className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            <span className="hidden sm:inline">{isAnalyzing ? 'Procesando...' : 'Organizar'}</span>
          </button>
        </div>
      </div>

      {quota && quotaStatus && !isPremium && (
        <div className={`mb-6 rounded-xl border px-4 py-3 ${quotaStatus.state === 'blocked'
          ? 'bg-rose-50 border-rose-200'
          : quotaStatus.state === 'warning'
            ? 'bg-amber-50 border-amber-200'
            : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-xs font-black uppercase tracking-wider ${quotaStatus.state === 'blocked'
              ? 'text-rose-700'
              : quotaStatus.state === 'warning'
                ? 'text-amber-700'
                : 'text-slate-600'}`}>
              Tarjetas: {quotaStatus.used} / {quotaStatus.quota}
            </p>
          </div>
          {quotaStatus.state === 'blocked' && (
            <p className="mt-1 text-xs font-medium text-rose-700">
              Llegaste a tu límite de {quotaStatus.quota} tarjetas. Elimina o archiva tarjetas para añadir más.
            </p>
          )}
          {quotaStatus.state === 'warning' && (
            <p className="mt-1 text-xs font-medium text-amber-700">
              Te quedan {quotaStatus.remaining} tarjetas de tu límite de {quotaStatus.quota}.
            </p>
          )}
          <div className="mt-2 h-1.5 bg-white rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${quotaStatus.state === 'blocked'
                ? 'bg-rose-500'
                : quotaStatus.state === 'warning'
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, quotaStatus.percentage)}%` }}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 sm:p-6 border-b bg-slate-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
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
            disabled={!isPremium && quotaStatus?.state === 'blocked'}
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
            onFileChange={(file) => {
              const event = { target: { files: [file] }, preventDefault: () => {} } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleFileChange(event);
            }}
            isReadingFile={isReadingFile}
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
          columnPriority={columnPriority}
          termHeader={termHeader}
          definitionHeader={definitionHeader}
          onUpdateField={handleUpdateField}
          onBlurRow={handleBlurRow}
          onRemoveRow={handleRemoveRow}
          selectable
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
          activeColumn={activeColumn}
          onColumnChange={setActiveColumn}
        />

        {archivedAssociations.length > 0 && (
          <div className="pt-4 sm:pt-6">
            <div className="px-4 sm:px-8 pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Tarjetas Archivadas</h3>
              <p className="text-xs sm:text-sm text-slate-500">Estas tarjetas ya no aparecen en tus partidas. Puedes restaurarlas en cualquier momento.</p>
            </div>
            <AssociationTable
              associations={sortedArchived}
              sort={archivedSort}
              onSort={(newSort) => setArchivedSort(nextSort(archivedSort, newSort.field as SortField))}
              columnPriority={columnPriority}
              termHeader={termHeader}
              definitionHeader={definitionHeader}
              onUpdateField={handleUpdateField}
              onBlurRow={handleBlurRow}
              onRemoveRow={handleRemoveRow}
              onRestoreRow={handleRestoreRow}
              isArchived
              activeColumn={activeColumn}
              onColumnChange={setActiveColumn}
            />
          </div>
        )}
      </div>

      {aiSuggestions && <SmartGroupModal originalList={editList} suggestions={aiSuggestions} onCancel={() => setAiSuggestions(null)} onConfirm={(groups) => { if (onCreateMultiple) onCreateMultiple(groups); setAiSuggestions(null); onBack(); }} />}
    </div>
  );
};
