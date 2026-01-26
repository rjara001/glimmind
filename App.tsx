
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { Auth } from './components/Auth';
import { AssociationList } from './types';
import { auth, onAuthStateChanged, isConfigured } from './firebase';
import { listService } from './services/firestoreService';

const GUEST_ID = 'guest-user-default';
const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Invitado (Local)',
  photoURL: 'https://ui-avatars.com/api/?name=Glim+Mind&background=6366f1&color=fff'
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
  const [lists, setLists] = useState<AssociationList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showGameSettings, setShowGameSettings] = useState(false);

  useEffect(() => {
    const savedGuest = localStorage.getItem('glimmind_guest_user');
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        if (savedGuest) {
          setIsSyncing(true);
          try { await listService.migrateGuestData(GUEST_ID, firebaseUser.uid); }
          catch (e) { console.error("Migration error:", e); }
          finally { setIsSyncing(false); }
        }
        setUser(firebaseUser);
      } else if (savedGuest) {
        setUser(JSON.parse(savedGuest));
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = listService.subscribeToLists(user.uid, (updatedLists) => {
      setLists(updatedLists);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveList = async (updatedList: AssociationList) => {
    if (!user) return;
    try {
      setIsSyncing(true);
      await listService.saveList(user.uid, updatedList);
      setLastSaved(Date.now());
      setTimeout(() => setLastSaved(null), 2000);
    } catch (error) {
      console.error("Save error:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!user || !confirm('¿Eliminar esta lista permanentemente?')) return;
    try {
      await listService.deleteList(user.uid, id);
    } catch (error) {
      console.error("Delete error:", error);
    }
  };

  if (loading || isSyncing && lists.length === 0) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-6 text-slate-400 font-bold uppercase text-[10px] tracking-widest animate-pulse">Glimmind Sincronizando...</p>
    </div>
  );

  if (!user) return <Auth onLoginDev={() => {
    localStorage.setItem('glimmind_guest_user', JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
  }} />;

  const currentList = lists.find(l => l.id === selectedListId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/30">
      <header className="bg-white/80 backdrop-blur-xl border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100 group-hover:rotate-6 transition-transform">G</div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">Glimmind</h1>
            <div className="flex items-center gap-1.5 mt-1">
               {isSyncing ? (
                 <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping"></div>
               ) : lastSaved ? (
                 <svg className="w-3 h-3 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg>
               ) : null}
               <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                 {isSyncing ? 'Guardando...' : lastSaved ? 'Sincronizado' : 'En línea'}
               </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {view === 'game' && (
            <button 
              onClick={() => setShowGameSettings(true)}
              className="p-2.5 text-slate-400 hover:text-indigo-600 transition bg-slate-50 rounded-xl border border-slate-100 shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          
          <div className="h-11 pl-1.5 pr-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3">
            <img src={user.photoURL} className="w-8 h-8 rounded-xl shadow-sm border border-white" alt="Profile" />
            <span className="hidden md:block text-xs font-black text-slate-700 max-w-[120px] truncate">{user.displayName}</span>
            <button onClick={() => { auth?.signOut(); localStorage.clear(); setUser(null); setView('dashboard'); }} className="text-slate-300 hover:text-rose-500 transition-colors ml-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        {view === 'dashboard' && (
          <Dashboard 
            lists={lists} 
            onCreate={(name, concept, initialAssocs) => {
              const newList: AssociationList = {
                id: crypto.randomUUID(), 
                userId: user.uid, 
                name, 
                concept, 
                associations: initialAssocs, 
                settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 }, 
                createdAt: Date.now()
              };
              handleSaveList(newList);
              setSelectedListId(newList.id);
              setView('game');
            }} 
            onDelete={handleDeleteList}
            onEdit={(id) => { setSelectedListId(id); setView('editor'); }}
            onPlay={(id) => { setSelectedListId(id); setView('game'); }}
          />
        )}
        {view === 'editor' && currentList && (
          <ListEditor list={currentList} onSave={handleSaveList} onBack={() => setView('dashboard')} />
        )}
        {view === 'game' && currentList && (
          <GameView 
            list={currentList} 
            onUpdateList={handleSaveList} 
            onBack={() => setView('dashboard')} 
            showSettings={showGameSettings}
            setShowSettings={setShowGameSettings}
          />
        )}
      </main>
    </div>
  );
};

export default App;
