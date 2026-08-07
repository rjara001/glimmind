import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { QuickAddModal } from './components/QuickAddModal';
import { SettingsView } from './components/SettingsView';
import { HistoryView } from './components/HistoryView';
import { ReportsView } from './components/ReportsView';
import { Auth } from './components/Auth';
import { ToastProvider, useToast } from './components/Toast';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { useGameStore } from './store/gameStore';
import { auth, onAuthStateChanged } from './firebase';
import type { User } from 'firebase/auth';
import { listService } from './services/firestoreService';
import { APP_VERSION } from './constants/version';
import { computeQuotaStatus, countCards } from './utils/quota';
import { createActivityEvent, buildListDiffEvents } from './utils/activity';

const GUEST_ID = 'dev-user-local';
const LAST_PLAYED_KEY = 'glimmind_last_played';

const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Local Guest',
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff'
};

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<'dashboard' | 'game' | 'editor' | 'activity' | 'reports' | 'settings'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [lastPlayedId, setLastPlayedId] = useState<string | undefined>(() => {
    return localStorage.getItem(LAST_PLAYED_KEY) || undefined;
  });
  
  const { 
    user, setUser, 
    setCurrentList, 
    updateAssociations,
    setLists,
    syncFromCloud,
    isLoaded 
  } = useGameStore();

  const celebration = useGameStore(state => state.celebration);
  const clearCelebration = useGameStore(state => state.clearCelebration);

  const currentListId = useGameStore(state => state.currentListId);
  const lists = useGameStore(state => state.lists);
  const currentList = lists.find(l => l.id === currentListId) || null;
  
  console.log('[DEBUG] render - view:', view, 'currentListId:', currentListId, 'lists.length:', lists.length, 'currentList:', currentList?.name);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        localStorage.removeItem('glimmind_guest_user');
        setUser(firebaseUser);
        return;
      }

      const savedGuest = localStorage.getItem('glimmind_guest_user');
      if (savedGuest) {
        try {
          const guest = JSON.parse(savedGuest);
          if (guest && guest.uid === GUEST_ID) {
            setUser(guest);
            return;
          }
        } catch {
          // Ignore corrupted guest data
        }
      }

      localStorage.removeItem('glimmind_guest_user');
      setUser(null);
    });
    return () => unsubscribe();
  }, [setUser]);

  // Load data when user changes
  useEffect(() => {
    useGameStore.getState().loadInitialData();
    useGameStore.getState().loadProgress();
    useGameStore.getState().loadQuota();
    useGameStore.getState().loadSettings();
  }, [user]);

  // Auto-redirect to last played list on page load
  const [autoStartGame, setAutoStartGame] = useState(false);
  
  useEffect(() => {
    if (!isLoaded || !user || !lastPlayedId) return;
    
    const lists = useGameStore.getState().lists;
    const lastList = lists.find(l => l.id === lastPlayedId);
    
    if (lastList) {
      setCurrentList(lastPlayedId);
      setView('game');
      setAutoStartGame(true);
    }
  }, [isLoaded, user, lastPlayedId]);

  const handleSyncFromCloud = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      await syncFromCloud();
      showToast('Datos sincronizados desde la nube', 'success');
    } catch (error) {
      showToast('Error al sincronizar', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateAssociationsWrapper = useCallback(async (updatedAssociations: any[]) => {
    if (currentListId) {
      updateAssociations(currentListId, updatedAssociations);
    }
  }, [currentListId, updateAssociations]);

  const handleQuickAdd = useCallback((listId: string, term: string, definition: string) => {
    const { lists, quota } = useGameStore.getState();
    const targetList = lists.find(l => l.id === listId);
    if (!targetList) return;

    if (quota && computeQuotaStatus(countCards(lists) + 1, quota.cardQuota).state === 'blocked') {
      showToast(`Llegaste a tu límite de ${quota.cardQuota} tarjetas.`, 'error');
      return;
    }

    const newAssociation = {
      id: crypto.randomUUID(),
      term,
      definition,
      currentCycle: 1,
      status: 'pending' as const,
      isLearned: false,
      isArchived: false,
    };
    useGameStore.getState().updateAssociations(listId, [...targetList.associations, newAssociation]);
    showToast(`Agregado a "${targetList.name}"`, 'success');
  }, [showToast]);

  const handleUpdateList = useCallback(async (updatedList: any) => {
    const { lists } = useGameStore.getState();
    const prevList = lists.find(l => l.id === updatedList.id);
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
    const updatedLists = lists.map(l => l.id === updatedList.id ? updatedList : l);
    setLists(updatedLists);
    
    if (user && user.uid !== GUEST_ID) {
      try {
        await listService.updateList(updatedList.id, {
          name: updatedList.name,
          concept: updatedList.concept,
          associations: updatedList.associations,
          settings: updatedList.settings,
        });
        useGameStore.getState().loadQuota();
      } catch (error: any) {
        console.error("Failed to sync list updates:", error);
        showToast(error.message || 'Error al guardar la lista', 'error');
      }
    }
  }, [setLists, user, showToast]);

  const handleCreateList = async (name: string, concept: string, initialAssocs: any[]) => {
    const { lists, quota } = useGameStore.getState();

    if (!quota) {
      await useGameStore.getState().loadQuota();
    }

    const currentQuota = useGameStore.getState().quota;
    const isBlocked = currentQuota && computeQuotaStatus(countCards(lists) + initialAssocs.length, currentQuota.cardQuota).state === 'blocked';

    console.log('[DEBUG][createList] quota=', currentQuota, 'isBlocked=', isBlocked, 'countCards=', countCards(lists), 'initialAssocs=', initialAssocs.length);

    if (isBlocked) {
      await useGameStore.getState().loadQuota();
      const refreshedQuota = useGameStore.getState().quota;
      if (refreshedQuota && computeQuotaStatus(countCards(lists) + initialAssocs.length, refreshedQuota.cardQuota).state === 'blocked') {
        console.log('[DEBUG][createList] BLOCKED by quota', refreshedQuota);
        showToast(`Llegaste a tu límite de ${refreshedQuota.cardQuota} tarjetas.`, 'error');
        return;
      }
    }

    if (!currentQuota) {
      showToast('No se pudo cargar la cuota. Reintentá en un momento.', 'error');
      return;
    }

    const newListData = {
      userId: user?.uid || GUEST_ID, 
      name, 
      concept, 
      associations: initialAssocs, 
      isArchived: false,
      settings: { mode: 'training' as const, flipOrder: 'normal' as const, threshold: 0.95, ignoreArticles: true, showHints: true },
    };
    
    const tempId = `temp_${Date.now()}`;
    const newList = { ...newListData, id: tempId };
    
    setLists([...lists, newList]);
    
    if (user && user.uid !== GUEST_ID) {
      try {
        const newId = await listService.createList(newListData);
        const updatedList = { ...newList, id: newId };
        const { lists } = useGameStore.getState();
        setLists(lists.map(l => l.id === tempId ? updatedList : l));
        setCurrentList(newId);
        useGameStore.getState().loadQuota();
        const createdEvents = initialAssocs.map((association: any) => createActivityEvent({
          userId: user.uid,
          listId: newId,
          cardId: association.id,
          cardTerm: association.term,
          type: 'card_created',
        }));
        useGameStore.getState().recordActivity(createdEvents);
      } catch (error: any) {
        console.error("Failed to create list:", error);
        showToast(error.message || 'Error al crear la lista', 'error');
        useGameStore.getState().loadQuota();
      }
    } else {
      setCurrentList(tempId);
      const createdEvents = initialAssocs.map((association: any) => createActivityEvent({
        userId: GUEST_ID,
        listId: tempId,
        cardId: association.id,
        cardTerm: association.term,
        type: 'card_created',
      }));
      useGameStore.getState().recordActivity(createdEvents);
    }
    setView('editor');
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('¿Eliminar esta lista?')) return;
    
    const { lists } = useGameStore.getState();
    setLists(lists.filter(l => l.id !== id));
    
    if (user && user.uid !== GUEST_ID) {
      try {
        await listService.deleteList(id);
        useGameStore.getState().loadQuota();
      } catch (error) {
        console.error("Failed to delete list:", error);
      }
    }
  };

  const handleCreateMultipleLists = async (groups: { name: string, associations: any[] }[]) => {
    if (!user || !currentList) return;
    const { lists, quota } = useGameStore.getState();

    const totalNewCards = groups.reduce((sum, g) => sum + (g.associations?.length || 0), 0);
    const originalCardCount = currentList.associations?.length || 0;
    const isGuest = user.uid === GUEST_ID;

    // A reorganization only redistributes existing cards, so it never grows the total.
    if (totalNewCards > originalCardCount && quota && computeQuotaStatus(countCards(lists) - originalCardCount + totalNewCards, quota.cardQuota).state === 'blocked') {
      showToast(`Llegaste a tu límite de ${quota.cardQuota} tarjetas.`, 'error');
      return;
    }

    const originalListId = currentList.id;

    const newLists = groups.map(g => ({
      id: `temp_${crypto.randomUUID()}`,
      userId: user.uid || GUEST_ID,
      name: g.name,
      concept: currentList.concept,
      associations: g.associations,
      isArchived: false,
      settings: { mode: 'training' as const, flipOrder: 'normal' as const, threshold: 0.95, ignoreArticles: true, showHints: true },
    }));

    const emitMovedEvents = (targets: { id: string; associations: any[] }[]) => {
      const events = targets.flatMap(({ id, associations }) =>
        associations.map((association: any) => createActivityEvent({
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
      setLists([...currentLists.filter(l => l.id !== originalListId), ...newLists]);
      emitMovedEvents(newLists);
      showToast(`${groups.length} agrupaciones creadas con éxito`, 'success');
      return;
    }

    try {
      const newIds = await listService.splitList(originalListId, groups);
      const currentStoreLists = useGameStore.getState().lists;
      const newListsWithIds = newLists.map((newList, index) => ({ ...newList, id: newIds[index] }));
      setLists([...currentStoreLists.filter(l => l.id !== originalListId), ...newListsWithIds]);
      emitMovedEvents(newListsWithIds);
      useGameStore.getState().loadQuota();
      showToast(`${groups.length} agrupaciones creadas con éxito`, 'success');
    } catch (error) {
      console.error("Failed to split list:", error);
      showToast(error instanceof Error ? error.message : 'No se pudo dividir la lista.', 'error');
    }
  };

  if (!isLoaded) {
    return (
      <ToastProvider>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-slate-400 font-medium">Loading...</div>
        </div>
      </ToastProvider>
    );
  }

  if (!user) {
    return (
      <ToastProvider>
        <Auth 
          onLoginDev={() => {
            setUser(MOCK_USER);
          }} 
        />
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
    <div className="min-h-screen bg-slate-50">
      <header className={`bg-white border-b border-slate-200 px-4 py-3 ${view === 'game' ? 'hidden sm:block' : ''}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-black text-slate-900 tracking-tight">Glimmind</h1>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">v{APP_VERSION}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowQuickAdd(true)}
              aria-label="Agregar valor"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden sm:inline">Agregar</span>
            </button>
            {user.photoURL && (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={handleSyncFromCloud}
            disabled={isSyncing || user.uid === GUEST_ID}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? 'Sync...' : 'Sync'}
          </button>
          <button
            onClick={() => setView('activity')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${view === 'activity' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            Activity
          </button>
          <button
            onClick={() => setView('reports')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${view === 'reports' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
          >
            Reports
          </button>
          <button
            onClick={() => setView('settings')}
            aria-label="Configuración"
            className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 whitespace-nowrap"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button 
            onClick={() => { auth?.signOut(); setUser(null); setView('dashboard'); }}
            className="text-slate-300 hover:text-rose-500 transition-colors p-1.5 whitespace-nowrap"
            aria-label="Cerrar sesión"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
            </svg>
          </button>
          <span className="text-[10px] text-slate-400 ml-1 whitespace-nowrap">v{APP_VERSION}</span>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {view === 'dashboard' && (          <Dashboard 
            lists={lists}
            lastPlayedId={lastPlayedId}
            onCreate={handleCreateList} 
            onDelete={handleDeleteList} 
            onEdit={(id) => { setCurrentList(id); setView('editor'); }} 
            onPlay={(id) => { 
              console.log('[DEBUG] Play clicked, id:', id); 
              setCurrentList(id); 
              localStorage.setItem(LAST_PLAYED_KEY, id);
              setLastPlayedId(id);
              console.log('[DEBUG] currentListId set to:', useGameStore.getState().currentListId); 
              console.log('[DEBUG] lists:', useGameStore.getState().lists.length); 
              setView('game'); 
            }} 
          />
        )}
        {view === 'editor' && currentList && (
          <ListEditor 
            list={currentList} 
            onSave={handleUpdateList} 
            onBack={() => setView('dashboard')}
            onCreateMultiple={handleCreateMultipleLists}
          />
        )}
        {view === 'game' && currentList && (
          <GameView 
            list={currentList} 
            onUpdateAssociations={handleUpdateAssociationsWrapper} 
            onUpdateList={handleUpdateList}
            onBack={() => setView('dashboard')} 
            autoStart={autoStartGame}
          />
        )}
        {view === 'settings' && (
          <SettingsView onBack={() => setView('dashboard')} />
        )}
        {view === 'activity' && (
          <HistoryView onBack={() => setView('dashboard')} onGoToSettings={() => setView('settings')} />
        )}
        {view === 'reports' && (
          <ReportsView onBack={() => setView('dashboard')} onGoToSettings={() => setView('settings')} />
        )}
      </main>
      {showQuickAdd && (
        <QuickAddModal
          lists={lists}
          onAdd={handleQuickAdd}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
      {celebration && (
        <CelebrationOverlay celebration={celebration} onClose={clearCelebration} />
      )}
    </div>
    </ToastProvider>
  );
};

const AppWrapper: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default AppWrapper;
