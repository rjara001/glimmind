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
import { SyncChip } from "../layout/SyncChip";

export const Dashboard: React.FC<DashboardProps> = ({
  lastPlayedId,
  onCreateAndPlay,
  onAddDeck,
  onDelete,
  onEdit,
  onPlay,
  onYouTubeSuccess,
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
  const bootstrapStatus = useGameStore((state) => state.bootstrapStatus);
  const retryBootstrapPart = useGameStore((state) => state.retryBootstrapPart);
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
  const listsPhase = bootstrapStatus.lists;
  const quotaStatus = quota ? QuotaService.getStatus(countCards(lists), quota.tier) : null;
  const createDisabled = quotaStatus?.level === "blocked" && !isPremium;
  const createTitle =
    createDisabled && quotaStatus ? `Llegaste a tu límite de ${quotaStatus.maxCards} tarjetas` : undefined;

  if (listsPhase === "loading" && isFirstTime && !isCreating) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div role="status" className="flex flex-col items-center justify-center py-24 gap-3">
          <svg
            className="animate-spin h-8 w-8 text-indigo-600"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium text-gray-500">Cargando mazos…</span>
        </div>
      </div>
    );
  }

  if (listsPhase === "error" && isFirstTime && !isCreating) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div role="alert" className="flex flex-col items-center justify-center py-24 gap-3">
          <span className="text-sm font-medium text-red-700">No se pudieron actualizar tus mazos</span>
          <p className="text-xs text-gray-500">
            {bootstrapStatus.error ?? "Revisa tu conexión e inténtalo de nuevo."}
          </p>
          <button
            type="button"
            onClick={() => retryBootstrapPart("lists")}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isFirstTime && !isCreating) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <DeckStoreOnboarding
          onAddDeck={handleOnboardingAddDeck}
          onCreateCustom={handleOnboardingCreateCustom}
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

      <QuotaAlert
        status={quotaStatus}
        loading={bootstrapStatus.quota === "loading"}
        error={bootstrapStatus.quota === "error"}
        onRetry={() => retryBootstrapPart("quota")}
      />

      {!isFirstTime && (
        <div className="mb-6 flex flex-wrap gap-2">
          <SyncChip
            label="Mazos sincronizados"
            loadingLabel="Actualizando mazos…"
            errorLabel="Mazos sin actualizar"
            phase={listsPhase}
            onRetry={() => retryBootstrapPart("lists")}
          />
          <SyncChip
            label="Ajustes sincronizados"
            loadingLabel="Cargando ajustes…"
            errorLabel="Ajustes no sincronizados"
            phase={bootstrapStatus.settings}
            onRetry={() => retryBootstrapPart("settings")}
          />
          <SyncChip
            label="Sincronizado con la nube"
            loadingLabel="Sincronizando en la nube…"
            errorLabel="Cambios pendientes de sincronizar"
            phase={bootstrapStatus.sync}
            onRetry={() => retryBootstrapPart("sync")}
          />
        </div>
      )}

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
        quotaLoading={bootstrapStatus.quota === "loading"}
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