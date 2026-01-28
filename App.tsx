
import React, { useState, useEffect, useCallback } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { Auth } from './components/Auth';
import { AssociationList } from './types';
import { auth, onAuthStateChanged } from './firebase';
import { listService } from './services/firestoreService';

const GUEST_ID = 'dev-user-local'; 
const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Invitado Local',
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff'
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
  const [lists, setLists] = useState<AssociationList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showGameSettings, setShowSettings] = useState(false);

  // Inicialización y Auth
  useEffect(() => {
    const savedGuest = localStorage.getItem('glimmind_guest_user');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      } else if (savedGuest) {
        setUser(JSON.parse(savedGuest));
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Carga de datos inicial
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const initial = await listService.fetchInitialLists(user.uid);
      setLists(initial);
      setLoading(false);
    };
    load();
  }, [user]);

  // Sincronización manual a GCP
  const handleCloudSync = useCallback(async () => {
    if (!user || isSyncing) return;
    setIsSyncing(true);
    try {
      await listService.syncAllToCloud(user.uid, lists);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Error de sincronización:", error);
      alert("Hubo un problema al guardar en la nube.");
    } finally {
      setIsSyncing(false);
    }
  }, [user, lists, isSyncing]);

  // Auto-sync al salir
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasUnsavedChanges && user) {
        listService.syncAllToCloud(user.uid, lists);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [hasUnsavedChanges, user, lists]);

  const handleLocalUpdate = (updatedList: AssociationList) => {
    const listWithTimestamp = { ...updatedList, updatedAt: Date.now() };
    const updatedLists = lists.map(l => l.id === listWithTimestamp.id ? listWithTimestamp : l);
    if (!lists.find(l => l.id === listWithTimestamp.id)) updatedLists.push(listWithTimestamp);
    
    setLists(updatedLists);
    setHasUnsavedChanges(true);
    
    if (user) {
      localStorage.setItem(`glimmind_cache_${user.uid}`, JSON.stringify(updatedLists));
    }
  };

  const handleCreateList = async (name: string, concept: string, initialAssocs: any[]) => {
    if (!user) return;
    const newList: AssociationList = {
      id: crypto.randomUUID(), 
      userId: user.uid, 
      name, 
      concept, 
      associations: initialAssocs, 
      settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 }, 
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    setIsSyncing(true);
    try {
      await listService.saveToCloudDirect(user.uid, newList);
      const updatedLists = [...lists, newList];
      setLists(updatedLists);
      localStorage.setItem(`glimmind_cache_${user.uid}`, JSON.stringify(updatedLists));
      setSelectedListId(newList.id);
      setView('game');
    } catch (e) {
      handleLocalUpdate(newList);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!user || !confirm('¿Eliminar esta lista permanentemente?')) return;
    const updatedLists = lists.filter(l => l.id !== id);
    setLists(updatedLists);
    setHasUnsavedChanges(true);
    localStorage.setItem(`glimmind_cache_${user.uid}`, JSON.stringify(updatedLists));
    
    try {
      await listService.deleteFromCloud(id);
    } catch (e) {
      console.warn("Borrado local pendiente.");
    }
  };

  if (loading && user) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Sincronizando...</p>
    </div>
  );

  if (!user) return <Auth onLoginDev={() => {
    localStorage.setItem('glimmind_guest_user', JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
  }} />;

  const currentList = lists.find(l => l.id === selectedListId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <header className="bg-white/95 backdrop-blur-xl border-b border-slate-100 px-4 sm:px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-[0_4px_12px_rgba(79,70,229,0.3)] group-hover:rotate-6 transition-transform overflow-hidden">
            <span className="text-xl">G</span>
          </div>
          <div className="hidden xs:block">
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">Glimmind</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
               {isSyncing ? (
                 <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></div>
               ) : (
                 <div className={`w-1.5 h-1.5 rounded-full ${hasUnsavedChanges ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
               )}
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                 {isSyncing ? 'Enviando...' : hasUnsavedChanges ? 'Por sincronizar' : 'En la nube'}
               </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3">
          {hasUnsavedChanges && !isSyncing && (
            <button 
              onClick={handleCloudSync}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 animate-pulse"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="hidden xs:inline">Sincronizar</span>
            </button>
          )}

          {view === 'game' && (
            <button 
              onClick={() => setShowSettings(true)}
              className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition bg-slate-50 rounded-xl border border-slate-100 shadow-sm active:scale-95"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          
          <div className="h-11 pl-1.5 pr-1.5 sm:pr-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2 sm:gap-3">
            <img src={user.photoURL} className="w-8 h-8 rounded-xl shadow-sm border border-white" alt="Profile" />
            <span className="hidden md:block text-xs font-black text-slate-700 max-w-[120px] truncate">{user.displayName}</span>
            <button onClick={() => { auth?.signOut(); localStorage.clear(); setUser(null); setView('dashboard'); }} className="text-slate-300 hover:text-rose-500 transition-colors ml-1 sm:ml-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
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
          <ListEditor list={currentList} onSave={handleLocalUpdate} onBack={() => setView('dashboard')} />
        )}
        {view === 'game' && currentList && (
          <GameView 
            list={currentList} 
            onUpdateList={handleLocalUpdate} 
            onBack={() => setView('dashboard')} 
            showSettings={showGameSettings}
            setShowSettings={setShowSettings}
          />
        )}
      </main>
    </div>
  );
};

export default App;
