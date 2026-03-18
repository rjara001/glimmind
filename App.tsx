
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

  // Auth state listener - only runs once on mount
  useEffect(() => {
    console.log('[AUTH] Setting up auth listener');
    const savedGuest = localStorage.getItem('glimmind_guest_user');
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
      console.log('[AUTH] onAuthStateChanged fired, user:', firebaseUser?.uid);
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

  // Load data when user changes (login/logout) - only run on mount or user change
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setLoading(true);
      
      if (user && user.uid !== GUEST_ID) {
        // Logged in user - load from Firestore, save to localStorage
        try {
          const cloudLists = await listService.fetchListsByUser(user.uid);
          if (!isCancelled) {
            console.log('[LOAD] Cloud lists from Firestore:', JSON.stringify(cloudLists, null, 2));
            setLists(cloudLists);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(cloudLists));
            console.log('[LOAD] Loaded from Firestore:', cloudLists.length);
          }
        } catch (error) {
          console.error('[LOAD] Failed to load from Firestore:', error);
          // Fallback to localStorage
          const savedLists = localStorage.getItem(LOCAL_STORAGE_KEY);
          if (savedLists) {
            setLists(JSON.parse(savedLists));
          }
        }
      } else {
        // Guest or no user - load from localStorage
        const savedLists = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedLists && !isCancelled) {
          try {
            setLists(JSON.parse(savedLists));
          } catch (e) {
            console.error('Error loading from localStorage:', e);
          }
        }
      }
      
      if (!isCancelled) {
        setIsLoaded(true);
        setLoading(false);
      }
    };

    loadData();

    return () => { isCancelled = true; };
  }, [user]);

  // Save to localStorage whenever lists change - but only after initial load
  useEffect(() => {
    if (!isLoaded) {
      console.log('[LOCALSTORAGE] Skipping - not loaded yet');
      return;
    }
    console.log('[LOCALSTORAGE] Saving to localStorage, lists:', JSON.stringify(lists.map(l => ({ id: l.id, firstStatus: l.associations?.[0]?.status, firstIsLearned: l.associations?.[0]?.isLearned }))));
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
      console.log('[SYNC] Data being sent:', JSON.stringify({ associations: updatedAssociations }));
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
          <>
            {console.log('[DASHBOARD] Rendering with lists:', JSON.stringify(lists.map(l => ({ id: l.id, name: l.name, associationsCount: l.associations?.length, firstAssocStatus: l.associations?.[0]?.status, firstAssocIsLearned: l.associations?.[0]?.isLearned })), null, 2))}
            <Dashboard 
              lists={lists} 
              onCreate={handleCreateList} 
              onDelete={handleDeleteList} 
              onEdit={(id) => { setSelectedListId(id); setView('editor'); }} 
              onPlay={(id) => { setSelectedListId(id); setView('game'); }} 
            />
          </>
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
            onBack={async (updatedAssociations) => {
              // Use the updated associations if provided, otherwise use currentList
              let associationsToSave = currentList.associations;
              if (Array.isArray(updatedAssociations) && updatedAssociations.length > 0) {
                associationsToSave = updatedAssociations;
              }
              
              // Ensure it's an array
              if (!Array.isArray(associationsToSave)) {
                console.error('[BACK] Invalid associations:', associationsToSave);
                associationsToSave = [];
              }
               
              // Update local state first
              const updatedList = { ...currentList, associations: associationsToSave };
              console.log('[BACK] Updated list associations:', JSON.stringify(associationsToSave.slice(0, 2)));
              setLists(prev => prev.map(l => l.id === currentList.id ? updatedList : l));
               
              // Force save to Firestore if logged in - use updatedList, not currentList
              if (user && user.uid !== GUEST_ID) {
                try {
                  // Create clean object to avoid circular references - extract only needed fields
                  const cleanAssociations = associationsToSave.map((a: any) => ({
                    id: a.id,
                    term: a.term,
                    definition: a.definition,
                    status: a.status,
                    isLearned: a.isLearned,
                    isArchived: a.isArchived,
                    currentCycle: a.currentCycle,
                  }));
                  const cleanSettings = {
                    mode: updatedList.settings?.mode,
                    flipOrder: updatedList.settings?.flipOrder,
                    threshold: updatedList.settings?.threshold,
                  };
                  await listService.updateList(updatedList.id, {
                    name: updatedList.name,
                    concept: updatedList.concept,
                    associations: cleanAssociations,
                    settings: cleanSettings,
                  });
                  console.log('[BACK] Force saved on back navigation');
                } catch (e) {
                  console.error('[BACK] Force save failed:', e);
                }
              }
              setView('dashboard');
            }} 
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
