import { useCallback, useMemo, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { listService } from '../../services/firestoreService';
import { Association, AssociationList } from '../../types';
import type { AppView } from '../../types/app';
import { computeQuotaStatus, countCards } from '../../utils/quota';
import { createActivityEvent, buildListDiffEvents } from '../../utils/activity';
import { GUEST_ID, LAST_PLAYED_KEY } from '../../constants/app';
import { normalizeVoiceLanguageSettings } from '../../services/voice/languages';

type ToastType = 'success' | 'error' | 'info';

interface UseAppActionsParams {
  navigate: (view: AppView) => void;
  showToast: (message: string, type?: ToastType) => void;
  setLastPlayedId: (id: string | undefined) => void;
}

const DEFAULT_LIST_SETTINGS = {
  mode: 'training' as const,
  flipOrder: 'normal' as const,
  threshold: 0.95,
  ignoreArticles: true,
  showHints: true,
  autoRevealAfterSeconds: 15,
  autoAdvanceAfterAttempts: 3,
};

export function useAppActions({ navigate, showToast, setLastPlayedId }: UseAppActionsParams) {
  const user = useGameStore((state) => state.user);
  const setLists = useGameStore((state) => state.setLists);
  const updateAssociations = useGameStore((state) => state.updateAssociations);
  const syncFromCloud = useGameStore((state) => state.syncFromCloud);
  const currentListId = useGameStore((state) => state.currentListId);
  const lists = useGameStore((state) => state.lists);
  const isPremium = useGameStore((state) => state.quota?.tier === 'premium');

  const currentList = useMemo(
    () => lists.find((l) => l.id === currentListId) || null,
    [lists, currentListId],
  );

  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncFromCloud = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await syncFromCloud();
      showToast('Datos sincronizados desde la nube', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Error al sincronizar', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [user, syncFromCloud, showToast]);

  const handleUpdateAssociations = useCallback(async (updatedAssociations: Association[]) => {
    if (currentListId) {
      updateAssociations(currentListId, updatedAssociations);
    }
  }, [currentListId, updateAssociations]);

  const handlePlayList = useCallback((id: string) => {
    useGameStore.getState().setCurrentList(id);
    localStorage.setItem(LAST_PLAYED_KEY, id);
    setLastPlayedId(id);
    navigate('game');
  }, [setLastPlayedId, navigate]);

  const handleQuickAdd = useCallback((listId: string, term: string, definition: string) => {
    const { lists, quota } = useGameStore.getState();
    const targetList = lists.find((l) => l.id === listId);
    if (!targetList) return;

    if (!isPremium && quota && computeQuotaStatus(countCards(lists) + 1, quota.cardQuota).state === 'blocked') {
      showToast(`Llegaste a tu límite de ${quota.cardQuota} tarjetas.`, 'error');
      return;
    }

    const newAssociation: Association = {
      id: crypto.randomUUID(),
      term,
      definition,
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      isArchived: false,
    };
    useGameStore.getState().updateAssociations(listId, [...targetList.associations, newAssociation]);
    showToast(`Agregado a "${targetList.name}"`, 'success');
  }, [showToast, isPremium]);

  const handleUpdateList = useCallback(async (updatedList: AssociationList) => {
    const { lists } = useGameStore.getState();
    const prevList = lists.find((l) => l.id === updatedList.id);
    if (prevList && user) {
      const events = buildListDiffEvents({
        userId: user.uid,
        listId: updatedList.id,
        before: prevList.associations,
        after: updatedList.associations,
      });
      if (events.length > 0) {
        useGameStore.getState().recordActivity(events);
      }
    }
    const updatedLists = lists.map((l) => (l.id === updatedList.id ? updatedList : l));
    setLists(updatedLists);

    if (user && user.uid !== GUEST_ID) {
      try {
        await useGameStore.getState().syncToCloud(updatedList.id);
        useGameStore.getState().loadQuota();
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Error al guardar la lista', 'error');
      }
    }
  }, [setLists, user, showToast]);

  const createListCore = useCallback(async (name: string, concept: string, initialAssocs: Association[]): Promise<string | null> => {
    const { lists, quota } = useGameStore.getState();
    useGameStore.getState().setActivityRecordingEnabled(false);

    if (!quota) {
      await useGameStore.getState().loadQuota();
    }

    const currentQuota = useGameStore.getState().quota;
    const isPremiumNow = currentQuota?.tier === 'premium';
    const isBlocked = !isPremiumNow && currentQuota && computeQuotaStatus(countCards(lists) + initialAssocs.length, currentQuota.cardQuota).state === 'blocked';

    if (isBlocked) {
      await useGameStore.getState().loadQuota();
      const refreshedQuota = useGameStore.getState().quota;
      const refreshedPremium = refreshedQuota?.tier === 'premium';
      if (!refreshedPremium && refreshedQuota && computeQuotaStatus(countCards(lists) + initialAssocs.length, refreshedQuota.cardQuota).state === 'blocked') {
        showToast(`Llegaste a tu límite de ${refreshedQuota.cardQuota} tarjetas.`, 'error');
        useGameStore.getState().setActivityRecordingEnabled(true);
        return null;
      }
    }

    if (!currentQuota) {
      showToast('No se pudo cargar la cuota. Reintentá en un momento.', 'error');
      useGameStore.getState().setActivityRecordingEnabled(true);
      return null;
    }

    const newListData: Omit<AssociationList, 'id'> = {
      userId: user?.uid || GUEST_ID,
      name,
      concept,
      associations: initialAssocs,
      isArchived: false,
      settings: normalizeVoiceLanguageSettings(concept, { ...DEFAULT_LIST_SETTINGS }),
    };

    const tempId = `temp_${Date.now()}`;
    const newList: AssociationList = { ...newListData, id: tempId };

    setLists([...lists, newList]);

    let finalId = tempId;

    if (user && user.uid !== GUEST_ID) {
      try {
        const newId = await listService.createList(newListData);
        const updatedList = { ...newList, id: newId };
        const { lists: currentLists } = useGameStore.getState();
        setLists(currentLists.map((l) => (l.id === tempId ? updatedList : l)));
        useGameStore.getState().setCurrentList(newId);
        useGameStore.getState().loadQuota();
        finalId = newId;
        const createdEvents = initialAssocs.map((association: Association) => createActivityEvent({
          userId: user.uid,
          listId: newId,
          cardId: association.id,
          cardTerm: association.term,
          type: 'card_created',
        }));
        useGameStore.getState().recordActivity(createdEvents);
      } catch (error) {
        showToast(error instanceof Error ? error.message : 'Error al crear la lista', 'error');
        useGameStore.getState().loadQuota();
        useGameStore.getState().setActivityRecordingEnabled(true);
        return null;
      }
    } else {
      useGameStore.getState().setCurrentList(tempId);
      const createdEvents = initialAssocs.map((association: Association) => createActivityEvent({
        userId: GUEST_ID,
        listId: tempId,
        cardId: association.id,
        cardTerm: association.term,
        type: 'card_created',
      }));
      useGameStore.getState().recordActivity(createdEvents);
    }

    useGameStore.getState().setActivityRecordingEnabled(true);
    return finalId;
  }, [user, setLists, showToast]);

  const handleCreateList = useCallback(async (name: string, concept: string, initialAssocs: Association[]) => {
    const listId = await createListCore(name, concept, initialAssocs);
    if (listId) {
      navigate('editor');
    }
  }, [createListCore, navigate]);

  const handleCreateListAndPlay = useCallback(async (name: string, concept: string, initialAssocs: Association[]) => {
    const listId = await createListCore(name, concept, initialAssocs);
    if (listId) {
      handlePlayList(listId);
    }
  }, [createListCore, handlePlayList]);

  const handleCreateListQuick = useCallback(async (name: string, concept: string): Promise<string | null> => {
    return createListCore(name, concept, []);
  }, [createListCore]);

  const handleDeleteList = useCallback(async (id: string) => {
    if (!confirm('¿Eliminar esta lista?')) return;

    const { lists } = useGameStore.getState();
    setLists(lists.filter((l) => l.id !== id));

    if (user && user.uid !== GUEST_ID) {
      try {
        await listService.deleteList(id);
        useGameStore.getState().loadQuota();
      } catch (error) {
        // Ignore delete errors
      }
    }
  }, [user, setLists]);

  const handleCreateMultipleLists = useCallback(async (groups: { name: string; associations: Association[] }[]) => {
    if (!user || !currentList) return;
    useGameStore.getState().setActivityRecordingEnabled(false);
    const { lists, quota } = useGameStore.getState();

    const totalNewCards = groups.reduce((sum, g) => sum + (g.associations?.length || 0), 0);
    const originalCardCount = currentList.associations?.length || 0;
    const isGuest = user.uid === GUEST_ID;

    if (!isPremium && totalNewCards > originalCardCount && quota && computeQuotaStatus(countCards(lists) - originalCardCount + totalNewCards, quota.cardQuota).state === 'blocked') {
      showToast(`Llegaste a tu límite de ${quota.cardQuota} tarjetas.`, 'error');
      useGameStore.getState().setActivityRecordingEnabled(true);
      return;
    }

    const originalListId = currentList.id;

    const newLists = groups.map((g) => ({
      id: `temp_${crypto.randomUUID()}`,
      userId: user.uid || GUEST_ID,
      name: g.name,
      concept: currentList.concept,
      associations: g.associations,
      isArchived: false,
      settings: normalizeVoiceLanguageSettings(currentList.concept, { ...DEFAULT_LIST_SETTINGS }),
    }));

    const emitMovedEvents = (targets: { id: string; associations: Association[] }[]) => {
      const events = targets.flatMap(({ id, associations }) =>
        associations.map((association: Association) => createActivityEvent({
          userId: user.uid || GUEST_ID,
          listId: id,
          cardId: association.id,
          cardTerm: association.term,
          type: 'card_moved',
          fromListId: originalListId,
          toListId: id,
        })),
      );
      if (events.length > 0) {
        useGameStore.getState().recordActivity(events);
      }
    };

    if (isGuest) {
      const currentLists = useGameStore.getState().lists;
      setLists([...currentLists.filter((l) => l.id !== originalListId), ...newLists]);
      emitMovedEvents(newLists);
      showToast(`${groups.length} agrupaciones creadas con éxito`, 'success');
      useGameStore.getState().setActivityRecordingEnabled(true);
      return;
    }

    try {
      const newIds = await listService.splitList(originalListId, groups);
      const currentStoreLists = useGameStore.getState().lists;
      const newListsWithIds = newLists.map((newList, index) => ({ ...newList, id: newIds[index] }));
      setLists([...currentStoreLists.filter((l) => l.id !== originalListId), ...newListsWithIds]);
      emitMovedEvents(newListsWithIds);
      useGameStore.getState().loadQuota();
      showToast(`${groups.length} agrupaciones creadas con éxito`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'No se pudo dividir la lista.', 'error');
    }
    useGameStore.getState().setActivityRecordingEnabled(true);
  }, [user, currentList, isPremium, setLists, showToast]);

  const handleAddDeck = useCallback(async (name: string, concept: string, initialAssocs: Association[]): Promise<void> => {
    await createListCore(name, concept, initialAssocs);
  }, [createListCore]);

  return {
    isSyncing,
    currentList,
    handleSyncFromCloud,
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