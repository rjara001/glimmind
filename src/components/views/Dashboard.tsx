import { useCallback, useState } from "react";
import type { Association } from "../../types";
import type { PrebuiltDeck } from "../../types/prebuilt-deck";
import type { DashboardProps } from "../../types/dashboard";
import { normalizeAssociations, type AssociationLike } from "../../utils/normalizeAssociation";
import { useGameStore } from "../../store/gameStore";
import { useToast } from "../layout/Toast";
import { GoalWidget } from "../layout/GoalWidget";
import { QuotaAlert } from "../layout/QuotaAlert";
import { DeckStoreOnboarding } from "../onboarding/DeckStoreOnboarding";
import { CreateYouTubeDeckModal } from "../modals/CreateYouTubeDeckModal";
import { QuotaService } from "../../services/quotaService";
import { countCards } from "../../utils/quota";
import { useDashboardStats } from "../../hooks/dashboard/useDashboardStats";
import { useDashboardLists } from "../../hooks/dashboard/useDashboardLists";
import { useDeckImporter } from "../../hooks/dashboard/useDeckImporter";
import { DashboardProgressHero } from "./dashboard/DashboardProgressHero";
import { DashboardContinueBanner } from "./dashboard/DashboardContinueBanner";
import { DashboardToolbar } from "./dashboard/DashboardToolbar";
import { RecentListsStrip } from "./dashboard/RecentListsStrip";
import { BigListsGrid } from "./dashboard/BigListsGrid";
import { DashboardSearchBar } from "./dashboard/DashboardSearchBar";
import { CreateListForm } from "./dashboard/CreateListForm";
import { DashboardEmptyState } from "./dashboard/DashboardEmptyState";
import { ListGrid } from "./dashboard/ListGrid";

export const Dashboard: React.FC<DashboardProps> = ({
  lists,
  lastPlayedId,
  onCreate,
  onCreateAndPlay,
  onAddDeck,
  onDelete,
  onEdit,
  onPlay,
  onYouTubeSuccess,
  onTextImport,
}) => {
  const { showToast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newConcept, setNewConcept] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeckStore, setShowDeckStore] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);

  const progress = useGameStore((state) => state.progress);
  const setGoalTarget = useGameStore((state) => state.setGoalTarget);
  const quota = useGameStore((state) => state.quota);
  const isPremium = quota?.tier === "premium";

  const importer = useDeckImporter(
    useCallback(
      (message: string) => showToast(message, "success"),
      [showToast],
    ),
    useCallback((message: string) => alert(message), []),
  );

  const stats = useDashboardStats(lists);
  const { recentLists, bigLists, filteredLists, currentList } = useDashboardLists(
    lists,
    searchTerm,
    lastPlayedId,
  );

  const handleCreateEmpty = useCallback(() => {
    onCreate("Sin nombre", "Valor 1 / Valor 2", []);
  }, [onCreate]);

  const handleSubmitCreate = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName || !newConcept) return;
      const initialAssocs = [...importer.parseBulkData(importer.bulkData), ...importer.fileAssociations];
      onCreate(newName, newConcept, initialAssocs);
      setNewName("");
      setNewConcept("");
      importer.resetBulkInputs();
      setIsCreating(false);
      importer.setShowBulk(false);
    },
    [newName, newConcept, importer, onCreate],
  );

  const handleCancelCreate = useCallback(() => {
    setIsCreating(false);
    importer.resetBulkInputs();
    importer.setShowBulk(false);
  }, [importer]);

  const handleChooseFile = useCallback(() => {
    importer.fileInputRef.current?.click();
  }, [importer]);

  const transformDeckToAssociations = (deck: PrebuiltDeck): Association[] =>
    normalizeAssociations(
      deck.associations.map<AssociationLike>((a) => ({
        id: crypto.randomUUID(),
        term: a.term,
        definition: a.definition,
        currentCycle: 1,
        status: "pending",
        isLearned: false,
        isArchived: false,
      })),
    );

  const handleOnboardingAddDeck = useCallback(
    async (deck: PrebuiltDeck) => {
      await onCreateAndPlay(deck.name, deck.concept, transformDeckToAssociations(deck));
    },
    [onCreateAndPlay],
  );

  const handleStoreAddDeck = useCallback(
    async (deck: PrebuiltDeck) => {
      await onAddDeck(deck.name, deck.concept, transformDeckToAssociations(deck));
    },
    [onAddDeck],
  );

  const handleOnboardingCreateCustom = useCallback(() => setIsCreating(true), []);

  const handleStoreCreateCustom = useCallback(() => {
    setShowDeckStore(false);
    setIsCreating(true);
  }, []);

  const handleOpenYouTube = useCallback(() => setShowYouTubeModal(true), []);
  const handleCloseYouTube = useCallback(() => setShowYouTubeModal(false), []);
  const handleOpenDeckStore = useCallback(() => setShowDeckStore(true), []);
  const handleCloseDeckStore = useCallback(() => setShowDeckStore(false), []);

  const handleYouTubeSuccess = useCallback(
    (result: import("../../types/youtube-deck").VocabularyResult) => {
      setShowYouTubeModal(false);
      onYouTubeSuccess?.(result);
    },
    [onYouTubeSuccess],
  );

  const isFirstTime = lists.length === 0;
  const quotaStatus = quota ? QuotaService.getStatus(countCards(lists), quota.tier) : null;
  const createDisabled = quotaStatus?.level === "blocked" && !isPremium;
  const createTitle =
    createDisabled && quotaStatus ? `Llegaste a tu límite de ${quotaStatus.maxCards} tarjetas` : undefined;

  if (isFirstTime && !isCreating) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <DeckStoreOnboarding
          onAddDeck={handleOnboardingAddDeck}
          onCreateCustom={handleOnboardingCreateCustom}
          onYouTube={handleOpenYouTube}
          onTextImport={onTextImport ?? (() => {})}
        />
      </div>
    );
  }

  if (showDeckStore) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleCloseDeckStore}
            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm flex items-center gap-1"
          >
            ← Volver al Dashboard
          </button>
        </div>
        <DeckStoreOnboarding
          onAddDeck={handleStoreAddDeck}
          onCreateCustom={handleStoreCreateCustom}
          onYouTube={handleOpenYouTube}
          onTextImport={onTextImport ?? (() => {})}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <DashboardProgressHero stats={stats} />

      {progress && (
        <div className="mb-8">
          <GoalWidget progress={progress} onSetTarget={setGoalTarget} />
        </div>
      )}

      <QuotaAlert status={quotaStatus} />

      {lastPlayedId && currentList && (
        <DashboardContinueBanner
          currentList={currentList}
          lastPlayedId={lastPlayedId}
          onPlay={onPlay}
        />
      )}

      <DashboardToolbar
        onOpenYouTube={handleOpenYouTube}
        onOpenDeckStore={handleOpenDeckStore}
        onCreateEmpty={handleCreateEmpty}
        createDisabled={createDisabled}
        createTitle={createTitle}
      />

      <RecentListsStrip lists={recentLists} onPlay={onPlay} />

      <BigListsGrid
        lists={bigLists}
        milestones={progress?.milestones ?? {}}
        onPlay={onPlay}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      <DashboardSearchBar value={searchTerm} onChange={setSearchTerm} />

      {isCreating && (
        <CreateListForm
          newName={newName}
          setNewName={setNewName}
          newConcept={newConcept}
          setNewConcept={setNewConcept}
          showBulk={importer.showBulk}
          setShowBulk={importer.setShowBulk}
          importTab={importer.importTab}
          setImportTab={importer.setImportTab}
          bulkData={importer.bulkData}
          setBulkData={importer.setBulkData}
          parsedData={importer.parsedData}
          fileInputRef={importer.fileInputRef}
          isReadingFile={importer.isReadingFile}
          selectedFileName={importer.selectedFileName}
          fileAssociations={importer.fileAssociations}
          onChooseFile={handleChooseFile}
          onFileChange={importer.handleFileChange}
          onRemoveUploadedFile={importer.removeUploadedFile}
          onCancel={handleCancelCreate}
          onSubmit={handleSubmitCreate}
        />
      )}

      {filteredLists.length === 0 ? (
        <DashboardEmptyState
          hasSearchTerm={Boolean(searchTerm)}
          onClearSearch={() => setSearchTerm("")}
        />
      ) : (
        <ListGrid lists={filteredLists} onPlay={onPlay} onEdit={onEdit} onDelete={onDelete} />
      )}

      {showYouTubeModal && (
        <CreateYouTubeDeckModal onClose={handleCloseYouTube} onSuccess={handleYouTubeSuccess} />
      )}
    </div>
  );
};