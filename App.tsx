
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { Auth } from './components/Auth';
import { AssociationList } from './types';
import { auth, onAuthStateChanged, isConfigured } from './firebase';
import { listService } from './services/firestoreService';

const MOCK_USER = {
  uid: 'guest-user-default',
  displayName: 'Invitado (Local)',
  photoURL: 'https://ui-avatars.com/api/?name=Glim+Mind&background=6366f1&color=fff'
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
  const [lists, setLists] = useState<AssociationList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showGameSettings, setShowGameSettings] = useState(false);

  // 1. Manejo de Sesión
  useEffect(() => {
    // Intentar recuperar sesión de invitado primero
    const savedGuest = localStorage.getItem('glimmind_guest_user');
    
    if (isConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser: any) => {
        if (firebaseUser) {
          setUser(firebaseUser);
          localStorage.removeItem('glimmind_guest_user'); // Limpiar si entra con Google
        } else if (savedGuest) {
          setUser(JSON.parse(savedGuest));
        } else {
          setUser(null);
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      if (savedGuest) setUser(JSON.parse(savedGuest));
      setLoading(false);
    }
  }, []);

  // 2. Sincronización de Datos en tiempo real
  useEffect(() => {
    if (!user) {
      setLists([]);
      return;
    }
    // El listService maneja automáticamente si es Firestore o LocalStorage
    const unsubscribe = listService.subscribeToLists(user.uid, (updatedLists) => {
      setLists(updatedLists);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSaveList = async (updatedList: AssociationList) => {
    if (!user) return;
    try {
      await listService.saveList(user.uid, updatedList);
    } catch (error) {
      console.error("Error al guardar:", error);
      // Opcional: Notificación toast de error
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!user || !confirm('¿Estás seguro de que deseas eliminar esta lista permanentemente?')) return;
    try {
      await listService.deleteList(user.uid, id);
    } catch (error) {
      console.error("Error al eliminar:", error);
    }
  };

  const handleLoginGuest = () => {
    localStorage.setItem('glimmind_guest_user', JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
  };

  const handleLogout = () => {
    auth?.signOut();
    localStorage.removeItem('glimmind_guest_user');
    setUser(null);
    setView('dashboard');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-400 font-medium animate-pulse">Sincronizando Glimmind...</p>
    </div>
  );

  if (!user) return <Auth onLoginDev={handleLoginGuest} />;

  const currentList = lists.find(l => l.id === selectedListId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setView('dashboard')}>
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-200 group-hover:scale-105 transition-transform">G</div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-none">Glimmind</h1>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Studios</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {view === 'game' && (
            <button 
              onClick={() => setShowGameSettings(true)}
              className="p-2.5 text-slate-400 hover:text-indigo-600 transition bg-slate-50 rounded-xl active:scale-90 border border-slate-100"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          
          <div className="h-10 pl-1 pr-4 py-1 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-3">
            <img src={user.photoURL} className="w-8 h-8 rounded-full ring-2 ring-white shadow-sm" alt="Profile" />
            <span className="hidden md:block text-xs font-black text-slate-700 max-w-[100px] truncate">{user.displayName}</span>
            <div className="w-[1px] h-4 bg-slate-200 hidden md:block"></div>
            <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition-colors p-1">
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
