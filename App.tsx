
import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { Auth } from './components/Auth';
import { ToastProvider, useToast } from './components/Toast';
import { AssociationList, Association } from './types';
import { auth, onAuthStateChanged } from './firebase';
import { listService } from './services/firestoreService';
import { APP_VERSION } from './constants/version';

const GUEST_ID = 'dev-user-local';
const LOCAL_STORAGE_KEY = 'glimmind_lists';

const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Local Guest',
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff'
};

const AppContent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
  const [lists, setLists] = useState<AssociationList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const { showToast } = useToast();

  // Load from cloud first, fallback to localStorage
  useEffect(() => {
    const loadData = async () => {
      // First, try to load from localStorage as immediate fallback
      const savedLists = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedLists) {
        try {
          const parsed = JSON.parse(savedLists);
          console.log('[LOAD] Loaded from localStorage as fallback:', parsed.length);
          setLists(parsed);
        } catch (e) {
          console.error('Error loading from localStorage:', e);
        }
      }
      setIsLoaded(true);

      // Then try to load from cloud if user is logged in
      if (user && user.uid !== GUEST_ID) {
        try {
          console.log('[LOAD] Fetching from Firestore for user:', user.uid);
          const cloudLists = await listService.fetchListsByUser(user.uid);
          console.log('[LOAD] Got from cloud:', cloudLists.length);
          if (cloudLists.length > 0) {
            setLists(cloudLists);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudLists));
            console.log('[LOAD] Updated localStorage with cloud data');
          }
        } catch (error) {
          console.error('[LOAD] Failed to load from cloud, using localStorage:', error);
        }
      }
    };

    loadData();
  }, [user]);

  // Save to localStorage whenever lists change - but only after initial load
  useEffect(() => {
    if (!isLoaded) return;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lists));
  }, [lists, isLoaded]);

  // Auto-sync to cloud before unload
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (user && lists.length > 0) {
        // Save to localStorage first
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lists));
        
        // Try to sync to cloud
        try {
          for (const list of lists) {
            await listService.updateList(list.id, {
              name: list.name,
              concept: list.concept,
              associations: list.associations,
              settings: list.settings,
            });
          }
        } catch (e) {
          console.error('Auto-sync failed:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, lists]);

  useEffect(() => {
    const savedGuest = localStorage.getItem('glimmind_guest_user');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else if (savedGuest) {
        setUser(JSON.parse(savedGuest));
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      // Don't clear lists when user logs out - keep localStorage data
      return;
    }
    
    const loadLists = async () => {
      try {
        console.log('Fetching lists for user ID:', user.uid);
        const userLists = await listService.fetchListsByUser(user.uid);
        console.log('Fetched lists:', userLists);
        setLists(userLists);
      } catch (error) {
        console.error("Failed to load lists:", error);
        setLists([]);
      } finally {
        setLoading(false);
      }
    };

    loadLists();
  }, [user]);

  // Sync from cloud to local
  const handleSyncFromCloud = async () => {
    if (!user) return;
    console.log('[SYNC] handleSyncFromCloud called, user:', user.uid);
    setIsSyncing(true);
    try {
      console.log('[SYNC] Fetching from Firestore for user:', user.uid);
      const cloudLists = await listService.fetchListsByUser(user.uid);
      console.log('[SYNC] Got from cloud:', cloudLists.length, 'lists');
      setLists(cloudLists);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudLists));
      showToast('Datos sincronizados desde la nube', 'success');
    } catch (error) {
      console.error('Sync failed:', error);
      showToast('Error al sincronizar', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateAssociations = async (listId: string, updatedAssociations: Association[]) => {
    console.log('[SYNC] handleUpdateAssociations called, listId:', listId, 'user:', user?.uid);
    const listToUpdate = lists.find(l => l.id === listId);
    if (!listToUpdate) return;

    const updatedList = { ...listToUpdate, associations: updatedAssociations };
    const updatedLists = lists.map(l => l.id === listId ? updatedList : l);
    setLists(updatedLists);

    if (user && user.uid !== GUEST_ID) {
      console.log('[SYNC] Saving to Firestore, listId:', listId);
      try {
        await listService.updateList(listId, { associations: updatedAssociations });
        console.log('[SYNC] Saved to Firestore successfully');
      } catch (error) {
        console.error("Failed to sync association updates:", error);
      }
    } else {
      console.log('[SYNC] NOT saving to Firestore - user is guest or null, user:', user?.uid, 'GUEST_ID:', GUEST_ID);
    }
  };

  const handleUpdateList = async (updatedList: AssociationList) => {
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
  };

  const handleCreateList = async (name: string, concept: string, initialAssocs: any[]) => {
    const newListData: Omit<AssociationList, 'id'> = {
      userId: user?.uid || GUEST_ID, 
      name, 
      concept, 
      associations: initialAssocs, 
      isArchived: false,
      settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
    };
    
    const tempId = `temp_${Date.now()}`;
    const newList = { ...newListData, id: tempId };
    
    // Add to local state immediately
    setLists(prevLists => [...prevLists, newList]);
    
    if (user && user.uid !== GUEST_ID) {
      try {
        const newId = await listService.createList(newListData);
        // Update with real ID
        const updatedList = { ...newList, id: newId };
        setLists(prevLists => prevLists.map(l => l.id === tempId ? updatedList : l));
        setSelectedListId(newId);
      } catch (error) {
        console.error("Failed to create list:", error);
      }
    } else {
      setSelectedListId(tempId);
    }
    setView('editor');
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('¿Eliminar esta lista?')) return;
    
    setLists(prev => prev.filter(l => l.id !== id));
    
    if (user && user.uid !== GUEST_ID) {
      try {
        await listService.deleteList(id);
      } catch (error) {
        console.error("Failed to delete list:", error);
      }
    }
  };

  const currentList = lists.find(l => l.id === selectedListId) || null;

  if (loading) {
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
            localStorage.setItem('glimmind_guest_user', JSON.stringify(MOCK_USER));
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
            title={user.uid === GUEST_ID ? 'Inicia sesión para sincronizar' : 'Sincronizar desde la nube'}
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
              onClick={() => { auth?.signOut(); localStorage.removeItem('glimmind_guest_user'); setUser(null); setView('dashboard'); }}
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
            onEdit={(id) => { setSelectedListId(id); setView('editor'); }} 
            onPlay={(id) => { setSelectedListId(id); setView('game'); }} 
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
            onUpdateAssociations={(updatedAssociations) => handleUpdateAssociations(currentList.id, updatedAssociations)} 
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
