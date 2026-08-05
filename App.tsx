import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { QuickAddModal } from './components/QuickAddModal';
import { Auth } from './components/Auth';
import { ToastProvider, useToast } from './components/Toast';
import { CelebrationOverlay } from './components/CelebrationOverlay';
import { useGameStore } from './store/gameStore';
import { auth, onAuthStateChanged } from './firebase';
import { listService } from './services/firestoreService';
import { APP_VERSION } from './constants/version';
import { computeQuotaStatus, countCards } from './utils/quota';

const GUEST_ID = 'dev-user-local';
const LAST_PLAYED_KEY = 'glimmind_last_played';

const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Local Guest',
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff'
};

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
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
    const savedGuest = localStorage.getItem('glimmind_guest_user');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else if (savedGuest) {
        setUser(JSON.parse(savedGuest));
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, [setUser]);

  // Load data when user changes
  useEffect(() => {
    useGameStore.getState().loadInitialData();
    useGameStore.getState().loadProgress();
    useGameStore.getState().loadQuota();
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

    if (quota && computeQuotaStatus(countCards(lists) + initialAssocs.length, quota.cardQuota).state === 'blocked') {
      showToast(`Llegaste a tu límite de ${quota.cardQuota} tarjetas.`, 'error');
      return;
    }

    const newListData = {
      userId: user?.uid || GUEST_ID, 
      name, 
      concept, 
      associations: initialAssocs, 
      isArchived: false,
      settings: { mode: 'training' as const, flipOrder: 'normal' as const, threshold: 0.95, ignoreArticles: true },
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
      } catch (error: any) {
        console.error("Failed to create list:", error);
        showToast(error.message || 'Error al crear la lista', 'error');
        useGameStore.getState().loadQuota();
      }
    } else {
      setCurrentList(tempId);
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
    if (quota && computeQuotaStatus(countCards(lists) + totalNewCards, quota.cardQuota).state === 'blocked') {
      showToast(`Llegaste a tu límite de ${quota.cardQuota} tarjetas.`, 'error');
      return;
    }
    
    const newLists = groups.map(g => ({
      id: `temp_${crypto.randomUUID()}`,
      userId: user.uid || GUEST_ID,
      name: g.name,
      concept: currentList.concept,
      associations: g.associations,
      isArchived: false,
      settings: { mode: 'training' as const, flipOrder: 'normal' as const, threshold: 0.95, ignoreArticles: true },
    }));

    setLists([...lists, ...newLists]);

    if (user.uid !== GUEST_ID) {
      newLists.forEach(async (newList) => {
        try {
          const newId = await listService.createList(newList);
          const currentLists = useGameStore.getState().lists;
          setLists(currentLists.map(l => l.id === newList.id ? { ...newList, id: newId } : l));
        } catch (error) {
          console.error("Failed to sync AI grouped list:", error);
        }
      });
    }
    
    showToast(`${groups.length} agrupaciones creadas con éxito`, 'success');
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
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Glimmind</h1>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">v{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowQuickAdd(true)}
            aria-label="Agregar valor"
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
          <button 
            onClick={handleSyncFromCloud}
            disabled={isSyncing || user.uid === GUEST_ID}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </button>
          <div className="flex items-center gap-2">
            {user.photoURL && (
              <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full" />
            )}
            <button 
              onClick={() => { auth?.signOut(); setUser(null); setView('dashboard'); }}
              className="text-slate-300 hover:text-rose-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
            <span className="text-xs text-slate-400 ml-2">v{APP_VERSION}</span>
          </div>
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
