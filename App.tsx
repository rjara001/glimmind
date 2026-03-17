
import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { Auth } from './components/Auth';
import { ToastProvider } from './components/Toast';
import { AssociationList, Association } from './types';
import { auth, onAuthStateChanged } from './firebase';
import { listService } from './services/firestoreService';
import { APP_VERSION } from './constants/version';

const GUEST_ID = 'dev-user-local';
const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Local Guest',
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff'
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
  const [lists, setLists] = useState<AssociationList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);

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
      setLists([]);
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

  const handleUpdateAssociations = async (listId: string, updatedAssociations: Association[]) => {
    if (!user) return;

    const listToUpdate = lists.find(l => l.id === listId);
    if (!listToUpdate) return;

    const updatedList = { ...listToUpdate, associations: updatedAssociations };
    const updatedLists = lists.map(l => l.id === listId ? updatedList : l);
    setLists(updatedLists);

    try {
      await listService.updateList(listId, { associations: updatedAssociations });
    } catch (error) {
      console.error("Failed to sync association updates:", error);
      setLists(lists);
    }
  };

 const handleCreateList = async (name: string, concept: string, initialAssocs: any[]) => {
    if (!user) return;
    const newListData: Omit<AssociationList, 'id'> = {
      userId: user.uid, 
      name, 
      concept, 
      associations: initialAssocs, 
      isArchived: false,
      settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
    };
    
    try {
      const newId = await listService.createList(newListData);
      const newList = { ...newListData, id: newId };
      setLists(prevLists => [...prevLists, newList]);
      setSelectedListId(newId);
      setView('editor');
    } catch (e) {
      console.error("Failed to create list:", e);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!user || !confirm('Delete this list permanently?')) return;
    const originalLists = lists;
    const updatedLists = lists.filter(l => l.id !== id);
    setLists(updatedLists);
    
    try {
      await listService.deleteList(id);
    } catch (e) {
      console.error("Failed to delete list:", e);
      setLists(originalLists);
    }
  };
  
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Loading Glimmind...</p>
    </div>
  );

  if (!user) return <Auth onLoginDev={() => {
    localStorage.setItem('glimmind_guest_user', JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
  }} />;

  const currentList = lists.find(l => l.id === selectedListId);

  return (
    <ToastProvider>
      <div className="min-h-screen flex flex-col bg-slate-50/30">
        <header className="bg-white/95 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-[0_4px_15px_rgba(79,70,229,0.3)] group-hover:rotate-6 transition-transform relative overflow-hidden">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9" />
                <path d="M12 21c4.97 0 9-4.03 9-9" opacity="0.4" />
                <path d="M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">Glimmind</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="h-12 pl-1.5 pr-1.5 sm:pr-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2 sm:gap-3">
            <img src={user.photoURL} className="w-9 h-9 rounded-xl shadow-sm border-2 border-white" alt="Profile" />
            <span className="hidden md:block text-xs font-black text-slate-700 max-w-[120px] truncate">{user.displayName}</span>
            <button onClick={() => { auth?.signOut(); localStorage.clear(); setUser(null); setView('dashboard'); }} className="text-slate-300 hover:text-rose-500 transition-colors ml-1 sm:ml-2 p-1">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
            <span className="text-xs text-slate-400 ml-2">v{APP_VERSION}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {view === 'dashboard' && (
          <Dashboard lists={lists} onCreate={handleCreateList} onDelete={handleDeleteList} onEdit={(id) => { setSelectedListId(id); setView('editor'); }} onPlay={(id) => { setSelectedListId(id); setView('game'); }} />
        )}
        {view === 'editor' && currentList && (
          <ListEditor list={currentList} onSave={(updatedList) => handleUpdateAssociations(currentList.id, updatedList.associations)} onBack={() => setView('dashboard')} />
        )}
        {view === 'game' && currentList && (
          <GameView 
            list={currentList} 
            onUpdateAssociations={(updatedAssociations) => handleUpdateAssociations(currentList.id, updatedAssociations)} 
            onBack={() => setView('dashboard')} />
        )}
      </main>
    </div>
    </ToastProvider>
  );
};

export default App;
