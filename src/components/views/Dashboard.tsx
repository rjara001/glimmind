import { useCallback, useState } from "react";
import type { Association } from "../../types";
import type { PrebuiltDeck } from "../../types/prebuilt-deck";
import type { DashboardProps } from "../../types/dashboard";
import { normalizeAssociations } from "../../utils/normalizeAssociation";
import { useGameStore } from "../../store/gameStore";
import { GoalWidget } from "../layout/GoalWidget";
import { QuotaAlert } from "../layout/QuotaAlert";
import { DeckStoreOnboarding } from "../onboarding/DeckStoreOnboarding";
import { CreateYouTubeDeckModal } from "../modals/CreateYouTubeDeckModal";
import { QuotaService } from "../../services/quotaService";
import { countCards } from "../../utils/quota";
import { useDashboardStats } from "../../hooks/dashboard/useDashboardStats";
import { useDashboardLists } from "../../hooks/dashboard/useDashboardLists";
import { DashboardProgressHero } from "./dashboard/DashboardProgressHero";
import { DashboardContinueBanner } from "./dashboard/DashboardContinueBanner";
import { DashboardToolbar } from "./dashboard/DashboardToolbar";
import { RecentListsStrip } from "./dashboard/RecentListsStrip";
import { BigListsGrid } from "./dashboard/BigListsGrid";
import { DashboardSearchBar } from "./dashboard/DashboardSearchBar";
import { DashboardEmptyState } from "./dashboard/DashboardEmptyState";
import { ListGrid } from "./dashboard/ListGrid";

export const Dashboard: React.FC<DashboardProps> = ({
  lastPlayedId,
  onCreateAndPlay,
  onAddDeck,
  onDelete,
  onEdit,
  onPlay,
  onYouTubeSuccess,
  onTextImport,
  onCreateEmpty,
  isCreating: isCreatingProp,
  isSplitting,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeckStore, setShowDeckStore] = useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);

  const lists = useGameStore((state) => state.lists);
  const progress = useGameStore((state) => state.progress);
  const setGoalTarget = useGameStore((state) => state.setGoalTarget);
  const quota = useGameStore((state) => state.quota);
  const isPremium = quota?.tier === "premium";

  const stats = useDashboardStats(lists);
  const { recentLists, bigLists, filteredLists, currentList } = useDashboardLists(
    lists,
    searchTerm,
    lastPlayedId,
  );

  const handleCreateEmpty = useCallback(() => {
    onCreateEmpty();
  }, [onCreateEmpty]);

  const transformDeckToAssociations = (deck: PrebuiltDeck): Association[] =>
    normalizeAssociations(
      deck.associations.map((a) => ({
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
          isLoading={isCreatingProp}
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
          isLoading={isCreatingProp}
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
        isCreating={isCreatingProp}
        isSplitting={isSplitting}
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