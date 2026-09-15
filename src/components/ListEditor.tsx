import React, { useEffect, useCallback, FormEvent } from "react";
import type { AssociationList, Association } from "../types";
import { SmartGroupModal } from "../components/modals/SmartGroupModal";
import { useGameStore } from "../store/gameStore";
import { useToast } from "../components/layout/Toast";
import { QuotaAlert } from "../components/layout/QuotaAlert";
import { CreateListForm } from "./views/dashboard/CreateListForm";
import {
  ListEditorHeader,
  ListEditorNameSection,
  ListEditorToolbar,
  ListEditorTagFilter,
  ListEditorBulkImport,
  ListEditorTranslationBar,
  ListEditorTable,
  ListEditorFooter,
  ValidationScreen,
} from "../components/list-editor";
import { useListEditorState } from "../hooks/dashboard/useListEditorState";
import { useListEditorActions } from "../hooks/dashboard/useListEditorActions";
import { useListEditorQuota } from "../hooks/dashboard/useListEditorQuota";
import { useListEditorTranslation } from "../hooks/dashboard/useListEditorTranslation";

interface ListEditorProps {
  list: AssociationList;
  initialEditId?: string | null;
  onInitialEditConsumed?: () => void;
  onSave: (list: AssociationList) => Promise<void>;
  onBack: () => void;
  onBackLabel: string;
  onCreateMultiple?: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
  isCreateMode?: boolean;
  onCreateList?: (name: string, concept: string, associations: Association[], settings?: Partial<AssociationList["settings"]>) => Promise<string | null>;
}

export const ListEditor: React.FC<ListEditorProps> = ({
  list,
  initialEditId,
  onInitialEditConsumed,
  onSave,
  onBack,
  onBackLabel = "Volver al dashboard",
  onCreateMultiple,
  isCreateMode = false,
  onCreateList,
}) => {
  const { showToast } = useToast();
  const quota = useGameStore((state) => state.quota);
  const lists = useGameStore((state) => state.lists);
  const isPremium = quota?.tier === "premium";

  const state = useListEditorState(list, initialEditId ?? null);
  const quotaData = useListEditorQuota(state.editList);

  const translation = useListEditorTranslation({
    editList: state.editList,
    selectedIds: state.selectedIds,
    onSave,
    showToast,
    translateLang: state.translateLang,
    setEditList: state.setEditList,
    setIsTranslating: state.setIsTranslating,
    setTranslationUsed: state.setTranslationUsed,
  });

  const actions = useListEditorActions({
    editList: state.editList,
    setEditList: state.setEditList,
    selectedIds: state.selectedIds,
    selectedArchivedIds: state.selectedArchivedIds,
    onSave,
    onCreateMultiple: onCreateMultiple ?? (() => {}),
    showToast,
    translateLang: state.translateLang,
    lists,
    isSaving: state.isSaving,
    setIsSaving: state.setIsSaving,
    setNameError: state.setNameError,
    setShowImportModal: state.setShowImportModal,
    validationResult: state.validationResult,
    setValidationResult: state.setValidationResult,
    setShowValidationScreen: state.setShowValidationScreen,
    setSelectedIds: state.setSelectedIds,
    setSelectedArchivedIds: state.setSelectedArchivedIds,
    onBack,
    csvHeader: state.csvHeader,
    setTranslationUsed: state.setTranslationUsed,
    setIsTranslating: state.setIsTranslating,
  });

  useEffect(() => {
    if (initialEditId) {
      onInitialEditConsumed?.();
    }
  }, [initialEditId, onInitialEditConsumed]);

  // Only auto-save existing lists, not create mode
  useEffect(() => {
    if (!isCreateMode) {
      actions.cleanupAndSave(list);
    }
  }, [list, actions.cleanupAndSave, isCreateMode]);

  const handleSaveClick = useCallback(async () => {
    if (!state.hasName) {
      state.setNameError(true);
      document.getElementById("list-name")?.focus();
      showToast("⚠️ Ponle un nombre a tu mazo antes de guardar.", "error");
      return;
    }
    
    if (isCreateMode && onCreateList) {
      // Create new list in Firestore
      const id = await onCreateList(
        state.editList.name,
        state.editList.concept,
        state.editList.associations,
        state.editList.settings
      );
      if (id) {
        showToast("Mazo creado", "success");
        onBack();
      }
    } else {
      // Update existing list
      actions.handleSave();
    }
  }, [state.hasName, state.setNameError, state.editList, isCreateMode, onCreateList, actions.handleSave, showToast, onBack]);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <QuotaAlert status={quotaData.quotaStatus} />
      {state.showValidationScreen && (
        <ValidationScreen
          validationResult={state.validationResult}
          onConfirmImport={actions.importSelectedCards}
          onBack={actions.handleBackToEditor}
          deckName={state.editList.name}
          showToast={showToast as (message: string, type?: string) => void}
        />
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <ListEditorHeader onBack={actions.handleBack} onBackLabel={onBackLabel} />
        <ListEditorNameSection
          name={state.editList.name}
          onRename={actions.handleRename}
          onRenameBlur={actions.handleRenameBlur}
          nameError={state.nameError}
          hasName={state.hasName}
        />
        <ListEditorToolbar
          searchTerm={state.searchTerm}
          onSearchChange={state.setSearchTerm}
          selectedCount={state.selectedIds.size}
          translateLang={state.translateLang}
          onTranslateLangChange={state.setTranslateLang}
          isTranslating={state.isTranslating}
          onTranslate={translation.handleTranslateSelected}
          onDelete={actions.handleDeleteSelected}
          onExport={actions.handleExportSelected}
          onAddRow={actions.handleAddRow}
          isAddRowDisabled={!isPremium && quotaData.quotaStatus?.level === "blocked"}
          onToggleBulk={() => state.setShowBulk((prev) => !prev)}
        />
        <ListEditorTagFilter
          tags={quotaData.uniqueTags}
          activeFilter={state.activeTagFilter}
          onFilterChange={state.setActiveTagFilter}
          activeCount={state.activeAssociations.length}
        />
        {state.showBulk && <ListEditorBulkImport onBulkAdd={actions.handleBulkAdd} />}
        {state.showImportModal && (
          <CreateListForm
            newName={state.editList.name}
            setNewName={(v) => state.setEditList((c) => ({ ...c, name: v }))}
            newConcept={state.editList.concept || ""}
            setNewConcept={(v) => state.setEditList((c) => ({ ...c, concept: v }))}
            showBulk={false}
            importTab={"paste"}
            onCancel={() => state.setShowImportModal(false)}
            onSubmit={(_e: FormEvent) => {
              state.setShowImportModal(false);
              const saved = actions.cleanupAndSave(state.editList);
              if (saved)
                showToast(`Se guardaron los cambios a "${state.editList.name}"`, "success");
            }}
            maxCardsPerDeck={useGameStore.getState().settings?.maxCardsPerDeck ?? 50}
            totalCards={state.editList.associations.length}
          />
        )}
        <ListEditorTranslationBar
          selectedCount={state.selectedIds.size}
          translationUsed={quotaData.translationUsed}
          translationLimit={quotaData.translationLimit}
          translationPercentage={quotaData.translationPercentage}
          translationState={quotaData.translationState}
        />
        <ListEditorTable
          associations={state.sortedActive}
          sort={state.activeSort}
          onSort={(field) =>
            state.setActiveSort(
              state.activeSort && state.activeSort.field === field
                ? { field, direction: state.activeSort.direction === "asc" ? "desc" : "asc" }
                : { field, direction: "asc" }
            )
          }
          termHeader={state.termHeader}
          definitionHeader={state.definitionHeader}
          onUpdateField={actions.handleUpdateField}
          onUpdateTags={actions.handleUpdateTags}
          onBlurRow={actions.handleBlurRow}
          onRemoveRow={actions.handleRemoveRow}
          selectable
          autoOpenId={state.autoOpenActiveId}
          selectedIds={state.selectedIds}
          onToggleSelect={(id) => {
            state.setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
        />
        {state.archivedAssociations.length > 0 && (
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
                {state.selectedArchivedIds.size > 0 && (
                  <button
                    onClick={actions.handleRestoreSelected}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition shadow-sm"
                  >
                    Restaurar {state.selectedArchivedIds.size} seleccionado
                    {state.selectedArchivedIds.size > 1 ? "s" : ""}
                  </button>
                )}
              </div>
            </div>
            <ListEditorTable
              associations={state.sortedArchived}
              sort={state.archivedSort}
              onSort={(field) =>
                state.setArchivedSort(
                  state.archivedSort && state.archivedSort.field === field
                    ? { field, direction: state.archivedSort.direction === "asc" ? "desc" : "asc" }
                    : { field, direction: "asc" }
                )
              }
              termHeader={state.termHeader}
              definitionHeader={state.definitionHeader}
              onUpdateField={actions.handleUpdateField}
              onUpdateTags={actions.handleUpdateTags}
              onBlurRow={actions.handleBlurRow}
              onRemoveRow={actions.handleRemoveRow}
              onRestoreRow={actions.handleRestoreRow}
              isArchived
              selectable
              selectedIds={state.selectedArchivedIds}
              onToggleSelect={(id) => {
                state.setSelectedArchivedIds((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              autoOpenId={state.autoOpenArchivedId}
            />
          </div>
        )}
        <ListEditorFooter
          totalCards={state.editList.associations.length}
          isSaving={state.isSaving}
          onSave={handleSaveClick}
          hasName={state.hasName}
          onNameFocus={() => document.getElementById("list-name")?.focus()}
          showToast={showToast}
        />
      </div>

      {state.aiSuggestions && (
        <SmartGroupModal
          originalList={state.editList}
          suggestions={state.aiSuggestions}
          onCancel={() => state.setAiSuggestions(null)}
          onConfirm={(groups) => {
            if (onCreateMultiple) onCreateMultiple(groups);
            state.setAiSuggestions(null);
            onBack();
          }}
        />
      )}
    </div>
  );
};