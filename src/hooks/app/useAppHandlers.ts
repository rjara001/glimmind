import { useState, useCallback } from "react";
import { useGameStore } from "../../store/gameStore";
import { listService } from "../../services/listService";
import { Association, AssociationList } from "../../types";
import type { AppView } from "../../types/app";
import { QuotaService } from "../../services/quotaService";
import { LAST_PLAYED_KEY } from "../../constants/app";

type ToastType = "success" | "error" | "info";

interface UseAppHandlersParams {
  navigate: (view: AppView) => void;
  showToast: (message: string, type?: ToastType) => void;
  setLastPlayedId: (id: string | undefined) => void;
}

export interface UseAppHandlersReturn {
  isSyncing: boolean;
  handleSyncFromCloud: () => Promise<void>;
  currentList: AssociationList | null;
  handleUpdateAssociations: (updatedAssociations: Association[]) => void;
  handlePlayList: (id: string) => void;
  handleQuickAdd: (listId: string, term: string, definition: string) => void;
  handleUpdateList: (list: AssociationList) => Promise<void>;
  handleCreateList: (
    name: string,
    concept: string,
    associations: Association[],
    settings?: Partial<AssociationList["settings"]>
  ) => Promise<string | null>;
  handleCreateListQuick: (name: string) => Promise<string | null>;
  handleDeleteList: (id: string) => Promise<void>;
  handleCreateMultipleLists: (
    groups: { name: string; associations: Association[] }[],
    realListId?: string
  ) => Promise<void>;
  handleCreateListAndPlay: (
    name: string,
    concept: string,
    associations: Association[],
    settings?: Partial<AssociationList["settings"]>
  ) => Promise<void>;
  handleAddDeck: (deck: { name: string; associations: Association[]; concept?: string }) => Promise<void>;
}

export function useAppHandlers({
  navigate,
  showToast,
  setLastPlayedId,
}: UseAppHandlersParams): UseAppHandlersReturn {
  const user = useGameStore((state) => state.user);
  const updateAssociations = useGameStore((state) => state.updateAssociations);
  const syncFromCloud = useGameStore((state) => state.syncFromCloud);
  const currentListId = useGameStore((state) => state.currentListId);
  const lists = useGameStore((state) => state.lists);
  const setCurrentList = useGameStore((state) => state.setCurrentList);

  const currentList = lists.find((l) => l.id === currentListId) || null;

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncFromCloud = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await syncFromCloud();
      showToast("Datos sincronizados desde la nube", "success");
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Error al sincronizar",
        "error",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [user, syncFromCloud, showToast]);

  const handleUpdateAssociations = useCallback(
    (updatedAssociations: Association[]) => {
      if (!currentListId) return;
      const currentList = lists.find((l) => l.id === currentListId);
      if (!currentList) return;

      // Check if there are meaningful changes (compare relevant fields by ID)
      const prevMap = new Map(currentList.associations.map(a => [a.id, a]));
      const hasChanges = updatedAssociations.some((a) => {
        const prev = prevMap.get(a.id);
        if (!prev) return true; // new association
        return (
          prev.isLearned !== a.isLearned ||
          prev.currentCycle !== a.currentCycle ||
          prev.status !== a.status ||
          (prev.hits ?? 0) !== (a.hits ?? 0) ||
          (prev.misses ?? 0) !== (a.misses ?? 0) ||
          (prev.timesPlayed ?? 0) !== (a.timesPlayed ?? 0) ||
          (prev.lastPlayedAt ?? 0) !== (a.lastPlayedAt ?? 0)
        );
      });

      if (!hasChanges) return;

      // Ensure updatedAt is set on all associations
      const withTimestamps = updatedAssociations.map(a => ({
        ...a,
        updatedAt: a.updatedAt ?? Date.now()
      }));

      updateAssociations(currentListId, withTimestamps);
    },
    [currentListId, updateAssociations, lists],
  );

  const handlePlayList = useCallback(
    (id: string) => {
      // All lists are now real lists (no drafts)
      setCurrentList(id);
      localStorage.setItem(LAST_PLAYED_KEY, id);
      setLastPlayedId(id);
      navigate("game");
    },
    [setCurrentList, setLastPlayedId, navigate],
  );

  const handleQuickAdd = useCallback(
    (listId: string, term: string, definition: string) => {
      const { lists, quota } = useGameStore.getState();
      const targetList = lists.find((l) => l.id === listId);
      if (!targetList) return;

      const currentCards = lists.reduce(
        (sum, l) => sum + (l.associations?.length || 0),
        0,
      );
      const tier = quota?.tier || "free";
      const status = QuotaService.getStatus(currentCards, tier);

      if (status.level === "blocked") {
        showToast(
          `Llegaste a tu límite de ${status.maxCards} tarjetas. Elimina o archiva tarjetas para añadir más.`,
          "error",
        );
        return;
      }

      if (status.level === "danger") {
        showToast(
          `Te quedan solo ${status.remainingCards} tarjetas disponibles`,
          "error",
        );
      } else if (status.level === "warning") {
        showToast(
          `Estás acercándote al límite de tarjetas (${status.currentCards}/${status.maxCards})`,
          "info",
        );
      }

      const newAssociation: Association = {
        id: crypto.randomUUID(),
        term,
        definition: [definition],
        currentCycle: 1,
        status: "pending",
        isLearned: false,
        isArchived: false,
      };
      useGameStore
        .getState()
        .updateAssociations(listId, [...(targetList.associations || []), newAssociation]);
      showToast(`Agregado a "${targetList.name}"`, "success");
    },
    [showToast],
  );

  const handleCreateList = useCallback(
    async (
      name: string,
      concept: string,
      associations: Association[],
      settings?: Partial<AssociationList["settings"]>
    ): Promise<string | null> => {
      console.log('pass1');
      if (!user) {
        showToast("Debes iniciar sesión para crear listas", "error");
        return null;
      }
console.log('pass2');
      const defaultSettings: AssociationList["settings"] = {
        mode: "training",
        flipOrder: "normal",
        threshold: 0.95,
        ignoreArticles: true,
        showHints: true,
        autoRevealAfterSeconds: 15,
        autoAdvanceAfterAttempts: 3,
      };
console.log('pass3');
      try {
        const id = await listService.createList({
          name,
          concept,
          associations,
          userId: user.uid,
          settings: { ...defaultSettings, ...settings },
        });

        // Add the new list to the local store
        const newList: AssociationList = {
          id,
          userId: user.uid,
          name,
          concept,
          associations,
          isArchived: false,
          settings: { ...defaultSettings, ...settings } as AssociationList["settings"],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const currentLists = useGameStore.getState().lists;
        useGameStore.getState().setLists([...currentLists, newList]);

        showToast("Mazo creado", "success");
        return id;
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Error al crear el mazo",
          "error",
        );
        return null;
      }
    },
    [user, showToast],
  );

  const handleCreateListQuick = useCallback(
    async (name: string): Promise<string | null> => {
      return handleCreateList(name, "term / definition", []);
    },
    [handleCreateList],
  );

  const handleUpdateList = useCallback(
    async (list: AssociationList) => {
      if (!user) return;
      try {
        const listWithTimestamp = { ...list, updatedAt: Date.now() };
        await listService.updateList({
          id: listWithTimestamp.id,
          name: listWithTimestamp.name,
          concept: listWithTimestamp.concept,
          associations: listWithTimestamp.associations,
          settings: listWithTimestamp.settings,
        });
        const currentLists = useGameStore.getState().lists;
        useGameStore.getState().setLists(
          currentLists.map((l) => (l.id === listWithTimestamp.id ? listWithTimestamp : l)),
        );
        showToast("Lista guardada", "success");
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Error al guardar",
          "error",
        );
      }
    },
    [user, showToast],
  );

  const handleDeleteList = useCallback(
    async (id: string) => {
      if (!user) return;
      if (!id) {
        // Don't allow deleting lists with empty IDs (create mode lists)
        showToast("No se puede eliminar una lista sin guardar", "error");
        return;
      }
      try {
        await listService.deleteList(id);
        // Remove from local store
        const currentLists = useGameStore.getState().lists;
        useGameStore.getState().setLists(currentLists.filter((l) => l.id !== id));
        showToast("Mazo eliminado", "success");
      } catch (error) {
        // If list doesn't exist in Firestore (e.g., local-only list), still remove from local store
        const errorMessage = error instanceof Error ? error.message : "Error al eliminar";
        if (errorMessage.toLowerCase().includes("not found") || errorMessage.toLowerCase().includes("no existe")) {
          const currentLists = useGameStore.getState().lists;
          useGameStore.getState().setLists(currentLists.filter((l) => l.id !== id));
          showToast("Mazo eliminado (solo local)", "success");
        } else {
          showToast(errorMessage, "error");
        }
      }
    },
    [user, showToast],
  );

  const handleCreateMultipleLists = useCallback(
    async (
      groups: { name: string; associations: Association[] }[],
      realListId?: string
    ) => {
      if (!user || !realListId) return;
      try {
        await listService.splitList(realListId, groups);
        showToast("Mazos divididos correctamente", "success");
      } catch (error) {
        showToast(
          error instanceof Error ? error.message : "Error al dividir mazos",
          "error",
        );
      }
    },
    [user, showToast],
  );

  const handleCreateListAndPlay = useCallback(
    async (
      name: string,
      concept: string,
      associations: Association[],
      settings?: Partial<AssociationList["settings"]>
    ) => {
      const id = await handleCreateList(name, concept, associations, settings);
      if (id) {
        setCurrentList(id);
        navigate("game");
      }
    },
    [handleCreateList, setCurrentList, navigate],
  );

  const handleAddDeck = useCallback(
    async (deck: { name: string; associations: Association[]; concept?: string }) => {
      const id = await handleCreateList(
        deck.name,
        deck.concept || "term / definition",
        deck.associations
      );
      if (id) {
        setCurrentList(id);
        navigate("editor");
      }
    },
    [handleCreateList, setCurrentList, navigate],
  );

  return {
    isSyncing,
    handleSyncFromCloud,
    currentList,
    handleUpdateAssociations,
    handlePlayList,
    handleQuickAdd,
    handleUpdateList,
    handleCreateList,
    handleCreateListQuick,
    handleDeleteList,
    handleCreateMultipleLists,
    handleCreateListAndPlay,
    handleAddDeck,
  };
}