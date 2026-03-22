import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { Auth } from './components/Auth';
import { ToastProvider, useToast } from './components/Toast';
import { useGameStore } from './store/gameStore';
import { auth, onAuthStateChanged } from './firebase';
import { listService } from './services/firestoreService';
import { APP_VERSION } from './constants/version';

const GUEST_ID = 'dev-user-local';

const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Local Guest',
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff'
};

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const { 
    user, setUser, 
    setCurrentList, 
    updateAssociations,
    setLists,
    syncFromCloud,
    isLoaded 
  } = useGameStore();

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
  }, [user]);

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
      } catch (error) {
        console.error("Failed to sync list updates:", error);
      }
    }
  }, [setLists, user]);

  const handleCreateList = async (name: string, concept: string, initialAssocs: any[]) => {
    const { lists } = useGameStore.getState();
    const newListData = {
      userId: user?.uid || GUEST_ID, 
      name, 
      concept, 
      associations: initialAssocs, 
      isArchived: false,
      settings: { mode: 'training' as const, flipOrder: 'normal' as const, threshold: 0.95 },
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
      } catch (error) {
        console.error("Failed to create list:", error);
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
      } catch (error) {
        console.error("Failed to delete list:", error);
      }
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
      <header className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Glimmind</h1>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">v{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-3">
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
        {view === 'dashboard' && (
          <Dashboard 
            lists={lists} 
            onCreate={handleCreateList} 
            onDelete={handleDeleteList} 
            onEdit={(id) => { setCurrentList(id); setView('editor'); }} 
            onPlay={(id) => { console.log('[DEBUG] Play clicked, id:', id); setCurrentList(id); console.log('[DEBUG] currentListId set to:', useGameStore.getState().currentListId); console.log('[DEBUG] lists:', useGameStore.getState().lists.length); setView('game'); }} 
          />
        )}
        {view === 'editor' && currentList && (
          <ListEditor 
            list={currentList} 
            onSave={(updatedList) => handleUpdateAssociations(currentList.id, updatedList.associations)} 
            onBack={() => setView('dashboard')} 
          />
        )}
        {view === 'game' && currentList && (
          <GameView 
            list={currentList} 
            onUpdateAssociations={handleUpdateAssociationsWrapper} 
            onUpdateList={handleUpdateList}
            onBack={() => setView('dashboard')} 
          />
        )}
      </main>
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
