import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { ReactElement } from 'react';
import { AssociationList, Association } from '../types';
import { aiService, AIGroupSuggestion } from '../services/aiService';
import { flattenAssociations } from '../utils/flattenAssociations';
import { SmartGroupModal } from './SmartGroupModal';
import { QuickAddModal } from './QuickAddModal';
import { useGameStore } from '../store/gameStore';
import { computeQuotaStatus } from '../utils/quota';
import { downloadAssociationsCsv, parseCsvPairs, isHeaderPair } from '../utils/csv';
import { useToast } from './Toast';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useFitWidth } from '../hooks/useFitWidth';
import { MIN_GROUP_SIZE } from '../constants/limits';

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

interface SortIndicatorProps {
  sort: TableSort | null;
  field: SortField;
}

function SortIndicator({ sort, field }: SortIndicatorProps): ReactElement {
  const isActive = sort?.field === field;
  const isDescending = sort?.direction === 'desc';
  return (
    <svg
      className={`w-3 h-3 transition ${isActive ? 'text-indigo-600' : 'text-slate-200 group-hover:text-slate-400'} ${isActive && isDescending ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

interface ListEditorProps {
  list: AssociationList;
  onSave: (list: AssociationList) => void;
  onBack: () => void;
  onCreateMultiple?: (groups: { name: string, associations: Association[] }[]) => void;
}

export const ListEditor: React.FC<ListEditorProps> = ({ list, onSave, onBack, onCreateMultiple }) => {
  const { showToast } = useToast();
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [importTab, setImportTab] = useState<'paste' | 'upload'>('paste');
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editList, setEditList] = useState<AssociationList>(list);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIGroupSuggestion[] | null>(null);
  const [activeSort, setActiveSort] = useState<TableSort | null>(null);
  const [archivedSort, setArchivedSort] = useState<TableSort | null>(null);
  const [columnPriority, setColumnPriority] = useState<'term' | 'definition'>('term');
  const [showAddModal, setShowAddModal] = useState(false);

  const conceptParts = editList.concept.split('/');
  const termHeader = conceptParts[0] || 'Term';
  const definitionHeader = conceptParts[1] || 'Definition';
  const csvHeader: [string, string] = [termHeader, definitionHeader];

  const quota = useGameStore(state => state.quota);
  const lists = useGameStore(state => state.lists);
  const isPremium = quota?.tier === 'premium';

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
    console.log('[ListEditor][bulk] listId=', editList.id, 'incoming=', newAssocs.length, 'uniqueNew=', uniqueNewAssocs.length, 'skipped=', skippedCount, 'totalAfter=', editList.associations.length + uniqueNewAssocs.length);
    useGameStore.getState().setActivityRecordingEnabled(false);
    try {
      const saved = cleanupAndSave({ ...editList, associations: [...editList.associations, ...uniqueNewAssocs] });
      if (saved) {
        setBulkText('');
        setShowBulk(false);
        const message = skippedCount > 0
          ? `Se importaron ${uniqueNewAssocs.length} tarjetas (${skippedCount} duplicadas omitidas).`
          : `Se importaron ${uniqueNewAssocs.length} tarjetas.`;
        showToast(message, 'success');
        const user = useGameStore.getState().user;
        if (user && user.uid !== 'dev-user-local') {
          console.log('[ListEditor][bulk] syncToCloud after import for', editList.id, 'associations:', uniqueNewAssocs.length);
          useGameStore.getState().syncToCloud(editList.id).catch((error) => {
            console.error('[ListEditor][bulk] syncToCloud failed:', error);
          });
        }
      }
    } finally {
      useGameStore.getState().setActivityRecordingEnabled(true);
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
      console.log('[ListEditor][file] listId=', editList.id, 'incoming=', newAssocs.length, 'uniqueNew=', uniqueNewAssocs.length, 'skipped=', skippedCount, 'totalAfter=', editList.associations.length + uniqueNewAssocs.length);
      useGameStore.getState().setActivityRecordingEnabled(false);
      try {
        const saved = cleanupAndSave({ ...editList, associations: [...editList.associations, ...uniqueNewAssocs] });
        if (saved) {
          const message = skippedCount > 0
            ? `Se importaron ${uniqueNewAssocs.length} tarjetas de "${file.name}" (${skippedCount} duplicadas omitidas).`
            : `Se importaron ${uniqueNewAssocs.length} tarjetas de "${file.name}"`;
          showToast(message, 'success');
          const user = useGameStore.getState().user;
          if (user && user.uid !== 'dev-user-local') {
            console.log('[ListEditor][file] syncToCloud after import for', editList.id, 'associations:', uniqueNewAssocs.length);
            useGameStore.getState().syncToCloud(editList.id).catch((error) => {
              console.error('[ListEditor][file] syncToCloud failed:', error);
            });
          }
        }
      } finally {
        useGameStore.getState().setActivityRecordingEnabled(true);
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

  const handleModalAdd = useCallback((listId: string, term: string, definition: string) => {
    if (listId !== editList.id) return;
    const newAssociation: Association = {
      id: crypto.randomUUID(),
      term,
      definition,
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    };
    cleanupAndSave({ ...editList, associations: [...editList.associations, newAssociation] });
    showToast(`Añadida "${term}" a ${editList.name}`, 'success');
  }, [editList, cleanupAndSave, showToast]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditList(current => ({ ...current, name: e.target.value }));
  };

  const handleNameBlur = () => {
    const trimmed = editList.name.trim();
    if (!trimmed) {
      setEditList(current => ({ ...current, name: list.name }));
      return;
    }
    cleanupAndSave({ ...editList, name: trimmed });
  };

  const handleUpdateField = (id: string, field: keyof Association, value: any) => {
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
  };

  const handleRestoreRow = (id: string) => {
    const updatedAssociations = editList.associations.map(a => a.id === id ? { ...a, isArchived: false } : a);
    cleanupAndSave({ ...editList, associations: updatedAssociations });
  };

  const toolbarActionsRef = useRef<HTMLDivElement>(null);
  const toolbarMeasureRef = useRef<HTMLDivElement>(null);
  const showActionLabels = useFitWidth(toolbarActionsRef, toolbarMeasureRef);

  const actionButtonBase = 'inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 h-11 rounded-xl shadow-sm hover:border-indigo-600 hover:text-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed';

  const toolbarActions: Array<{
    key: string;
    label: string;
    title: string;
    onClick: () => void;
    disabled?: boolean;
    icon: ReactElement;
  }> = [
    {
      key: 'export',
      label: 'Export',
      title: 'Descargar tarjetas en CSV',
      onClick: () => downloadAssociationsCsv(editList.associations, `${editList.name}.csv`, csvHeader),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
      ),
    },
    {
      key: 'import',
      label: 'Import',
      title: 'Importar tarjetas',
      onClick: () => setShowBulk(!showBulk),
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
      ),
    },
    {
      key: 'add',
      label: 'Add Row',
      title: 'Añadir tarjeta',
      onClick: () => setShowAddModal(true),
      disabled: !isPremium && quotaStatus?.state === 'blocked',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
      ),
    },
  ];

  const activeAssociations = editList.associations.filter(a => !a.isArchived);
  const archivedAssociations = editList.associations.filter(a => a.isArchived);

  const filteredActive = activeAssociations.filter(assoc =>
    assoc.term.toLowerCase().includes(searchTerm.toLowerCase()) ||
    assoc.definition.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  const termPriority = columnPriority === 'term';
  const definitionPriority = columnPriority === 'definition';

  const isMobile = useMediaQuery('(max-width: 639px)');
  const termWidth = isMobile ? (termPriority ? 'w-[70%]' : 'w-[20%]') : '';
  const definitionWidth = isMobile ? (definitionPriority ? 'w-[70%]' : 'w-[20%]') : '';

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 sm:mb-8">
        <div className="flex items-center gap-4">
          <button onClick={() => { cleanupAndSave(editList); onBack(); }} className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm group" aria-label="Volver">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              <input
                type="text"
                value={editList.name}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
                aria-label="Nombre de la lista"
                className="w-full bg-transparent border-b-2 border-transparent focus:border-indigo-400 focus:outline-none transition"
              />
            </h2>
            <p className="text-sm text-gray-500">{activeAssociations.length} tarjetas activas • {archivedAssociations.length} archivadas</p>
          </div>
        </div>

        <div className="flex justify-end md:justify-start">
          <button
            onClick={handleSmartSplit}
            disabled={isAnalyzing || activeAssociations.length < MIN_GROUP_SIZE}
            title={activeAssociations.length < MIN_GROUP_SIZE ? `Añade al menos ${MIN_GROUP_SIZE} tarjetas para usar esta función` : "Organizar tarjetas en grupos lógicos"}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white h-11 px-3 sm:px-6 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-md hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-wait"
          >
            {isAnalyzing ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>}
            <span>{isAnalyzing ? 'Procesando...' : 'Organizar'}</span>
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
              <input type="text" placeholder="Filter..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-9 sm:pl-11 pr-3 sm:pr-4 py-2 sm:py-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition outline-none shadow-sm" />
            </div>
            <div ref={toolbarActionsRef} className="relative flex items-center justify-end gap-2 w-full sm:w-auto">
              {toolbarActions.map(action => (
                <button
                  key={action.key}
                  type="button"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  title={action.title}
                  aria-label={action.label}
                  className={`${actionButtonBase} ${showActionLabels ? 'px-3' : 'w-11 justify-center'}`}
                >
                  {action.icon}
                  {showActionLabels && (
                    <span className="whitespace-nowrap text-[10px] sm:text-xs font-black uppercase tracking-widest">{action.label}</span>
                  )}
                </button>
              ))}
              <div ref={toolbarMeasureRef} aria-hidden="true" className="invisible absolute left-0 top-0 flex items-center gap-2 pointer-events-none">
                {toolbarActions.map(action => (
                  <span key={action.key} className={`${actionButtonBase} px-3`}>
                    {action.icon}
                    <span className="whitespace-nowrap text-[10px] sm:text-xs font-black uppercase tracking-widest">{action.label}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

        {showBulk && (
          <div className="p-4 sm:p-6 bg-indigo-50/50 border-b border-indigo-100">
            <div className="flex gap-2 mb-3 sm:mb-4">
              <button onClick={() => setImportTab('paste')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition ${importTab === 'paste' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Pegar texto</button>
              <button onClick={() => setImportTab('upload')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition ${importTab === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}>Subir archivo</button>
            </div>
            {importTab === 'paste' && (
              <>
                <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Term, Definition (one per line)" className="w-full h-28 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 border border-indigo-100 rounded-xl text-sm mb-3 sm:mb-4 outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-inner" />
                <div className="flex justify-end"><button onClick={handleBulkAdd} className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition">Process Import</button></div>
              </>
            )}
            {importTab === 'upload' && (
              <div className="flex flex-col items-center gap-3 py-3 sm:py-4">
                <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                <button onClick={() => fileInputRef.current?.click()} disabled={isReadingFile} className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait">{isReadingFile ? 'Leyendo archivo...' : 'Elegir archivo CSV'}</button>
                {selectedFileName && <p className="text-xs font-semibold text-slate-600">Archivo: {selectedFileName}</p>}
                <p className="text-[10px] text-slate-500">Formato .csv con "Término, Definición" por línea. El encabezado se detecta y se ignora automáticamente.</p>
              </div>
            )}
          </div>
        )}

        <div className="max-h-[55vh] overflow-x-auto">
          <table className={`w-full text-left ${isMobile ? 'table-fixed' : 'min-w-[640px]'}`}>
            <thead>
              <tr className="text-[10px] uppercase text-slate-400 font-black border-b bg-white sticky top-0 z-10">
                <th className={`px-4 sm:px-8 py-3 sm:py-4 ${termWidth}`}>
                  <button
                    onClick={() => setColumnPriority(columnPriority === 'term' ? 'definition' : 'term')}
                    className="flex items-center gap-1.5 uppercase group hover:text-slate-600 transition"
                    aria-label={`Prioridad: ${termHeader}`}
                  >
                    {termHeader}
                    <span className="text-[8px] normal-case tracking-normal opacity-60 group-hover:opacity-100 transition-opacity">
                      {columnPriority === 'term' ? '●' : '○'}
                    </span>
                    <SortIndicator sort={activeSort} field="term" />
                  </button>
                </th>
                <th className={`px-4 sm:px-8 py-3 sm:py-4 ${definitionWidth}`}>
                  <button
                    onClick={() => setColumnPriority(columnPriority === 'definition' ? 'term' : 'definition')}
                    className="flex items-center gap-1.5 uppercase group hover:text-slate-600 transition"
                    aria-label={`Prioridad: ${definitionHeader}`}
                  >
                    {definitionHeader}
                    <span className="text-[8px] normal-case tracking-normal opacity-60 group-hover:opacity-100 transition-opacity">
                      {columnPriority === 'definition' ? '●' : '○'}
                    </span>
                    <SortIndicator sort={activeSort} field="definition" />
                  </button>
                </th>
                <th className="px-4 sm:px-8 py-3 sm:py-4 w-10 sm:w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {sortedActive.map((assoc) => (
                <tr key={assoc.id} className="group hover:bg-slate-50/80 transition-colors">
                  <td className={`px-4 sm:px-8 py-2 sm:py-4 ${termWidth}`}>
                    <input
                      type="text"
                      value={assoc.term}
                      onBlur={handleBlurRow}
                      onChange={(e) => handleUpdateField(assoc.id, 'term', e.target.value)}
                      readOnly={isMobile && !termPriority}
                      className={`w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 placeholder-slate-300 ${isMobile && !termPriority ? 'truncate' : ''} ${!termPriority ? 'sm:truncate' : ''}`}
                      placeholder="Enter term..."
                    />
                  </td>
                  <td className={`px-4 sm:px-8 py-2 sm:py-4 ${definitionWidth}`}>
                    <input
                      type="text"
                      value={assoc.definition}
                      onBlur={handleBlurRow}
                      onChange={(e) => handleUpdateField(assoc.id, 'definition', e.target.value)}
                      readOnly={isMobile && !definitionPriority}
                      className={`w-full bg-transparent border-none focus:ring-0 text-slate-500 placeholder-slate-300 ${isMobile && !definitionPriority ? 'truncate' : ''} ${!definitionPriority ? 'sm:truncate' : ''}`}
                      placeholder="Enter definition..."
                    />
                  </td>
                  <td className="px-1 sm:px-8 py-2 sm:py-4 w-10 sm:w-24">
                    <button onClick={() => handleRemoveRow(assoc.id)} className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition" aria-label="Delete row">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredActive.length === 0 && <tr><td colSpan={3} className="px-4 sm:px-8 py-8 sm:py-12 text-center text-slate-400 text-sm italic">{searchTerm ? "No results in active cards." : "Add a card to get started."}</td></tr>}
            </tbody>
          </table>
        </div>

        {archivedAssociations.length > 0 && (
          <div className="pt-4 sm:pt-6">
            <div className="px-4 sm:px-8 pb-3 sm:pb-4">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">Tarjetas Archivadas</h3>
              <p className="text-xs sm:text-sm text-slate-500">Estas tarjetas ya no aparecen en tus partidas. Puedes restaurarlas en cualquier momento.</p>
            </div>
            <div className="max-h-[45vh] overflow-auto border-t">
              <table className={`w-full text-left ${isMobile ? 'table-fixed' : 'min-w-[640px]'}`}>
                <thead>
                  <tr className="text-[10px] uppercase text-slate-400 font-black border-b bg-white sticky top-0 z-10">
                    <th className={`px-4 sm:px-8 py-3 sm:py-4 ${termWidth}`}>
                      <button
                        onClick={() => setColumnPriority(columnPriority === 'term' ? 'definition' : 'term')}
                        className="flex items-center gap-1.5 uppercase group hover:text-slate-600 transition"
                        aria-label={`Prioridad: ${termHeader}`}
                      >
                        {termHeader}
                        <span className="text-[8px] normal-case tracking-normal opacity-60 group-hover:opacity-100 transition-opacity">
                          {columnPriority === 'term' ? '●' : '○'}
                        </span>
                        <SortIndicator sort={archivedSort} field="term" />
                      </button>
                    </th>
                    <th className={`px-4 sm:px-8 py-3 sm:py-4 ${definitionWidth}`}>
                      <button
                        onClick={() => setColumnPriority(columnPriority === 'definition' ? 'term' : 'definition')}
                        className="flex items-center gap-1.5 uppercase group hover:text-slate-600 transition"
                        aria-label={`Prioridad: ${definitionHeader}`}
                      >
                        {definitionHeader}
                        <span className="text-[8px] normal-case tracking-normal opacity-60 group-hover:opacity-100 transition-opacity">
                          {columnPriority === 'definition' ? '●' : '○'}
                        </span>
                        <SortIndicator sort={archivedSort} field="definition" />
                      </button>
                    </th>
                    <th className="px-4 sm:px-8 py-3 sm:py-4 w-10 sm:w-24 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {sortedArchived.map((assoc) => (
                    <tr key={assoc.id} className="group hover:bg-slate-50/80 transition-colors bg-slate-50/50">
                      <td className={`px-4 sm:px-8 py-2 sm:py-4 font-semibold text-slate-500 italic ${termWidth} ${isMobile && !termPriority ? 'truncate' : ''}`}>{assoc.term}</td>
                      <td className={`px-4 sm:px-8 py-2 sm:py-4 text-slate-500 italic ${definitionWidth} ${isMobile && !definitionPriority ? 'truncate' : ''}`}>{assoc.definition}</td>
                      <td className="px-1 sm:px-8 py-2 sm:py-4 text-right w-10 sm:w-24"><button onClick={() => handleRestoreRow(assoc.id)} className="inline-flex items-center justify-center gap-1 bg-white border border-indigo-200 text-indigo-600 h-8 w-8 sm:w-auto sm:h-auto sm:px-2.5 sm:py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-indigo-50 transition" aria-label="Restaurar"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" /></svg><span className="hidden sm:inline">Restaurar</span></button></td>
                    </tr>
                  ))}
                  {filteredArchived.length === 0 && <tr><td colSpan={3} className="px-4 sm:px-8 py-8 sm:py-12 text-center text-slate-400 text-sm italic">No hay resultados en tarjetas archivadas.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {aiSuggestions && <SmartGroupModal originalList={editList} suggestions={aiSuggestions} onCancel={() => setAiSuggestions(null)} onConfirm={(groups) => { if (onCreateMultiple) onCreateMultiple(groups); setAiSuggestions(null); onBack(); }} />}
      {showAddModal && (
        <QuickAddModal
          lists={[editList]}
          onAdd={handleModalAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
};
