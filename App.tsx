
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { GameView } from './components/GameView';
import { ListEditor } from './components/ListEditor';
import { Auth } from './components/Auth';
import { AssociationList, Association, AssociationStatus } from './types';
import { auth, db, onAuthStateChanged, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, isConfigured } from './firebase';

const MOCK_USER = {
  uid: 'guest-user-123',
  displayName: 'Invitado (Dev Mode)',
  photoURL: 'https://ui-avatars.com/api/?name=Guest+User&background=6366f1&color=fff'
};

const SAMPLE_LIST: AssociationList = {
  id: 'sample-list-1',
  userId: 'guest-user-123',
  name: 'Verbos Comunes',
  concept: 'Inglés / Español',
  associations: [
    { id: '1', term: 'Run', definition: 'Correr', status: AssociationStatus.DESCONOCIDA },
    { id: '2', term: 'Jump', definition: 'Saltar', status: AssociationStatus.DESCONOCIDA },
    { id: '3', term: 'Speak', definition: 'Hablar', status: AssociationStatus.DESCONOCIDA },
    { id: '4', term: 'Eat', definition: 'Comer', status: AssociationStatus.DESCONOCIDA },
    { id: '5', term: 'Sleep', definition: 'Dormir', status: AssociationStatus.DESCONOCIDA },
    { id: '6', term: 'Write', definition: 'Escribir', status: AssociationStatus.DESCONOCIDA },
    { id: '7', term: 'Read', definition: 'Leer', status: AssociationStatus.DESCONOCIDA },
    { id: '8', term: 'Think', definition: 'Pensar', status: AssociationStatus.DESCONOCIDA },
    { id: '9', term: 'Go', definition: 'Ir', status: AssociationStatus.DESCONOCIDA },
    { id: '10', term: 'Come', definition: 'Venir', status: AssociationStatus.DESCONOCIDA },
  ],
  settings: {
    mode: 'training',
    flipOrder: 'normal',
    threshold: 0.90
  },
  createdAt: Date.now()
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'game' | 'editor'>('dashboard');
  const [lists, setLists] = useState<AssociationList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [showGameSettings, setShowGameSettings] = useState(false);

  useEffect(() => {
    const guestUser = localStorage.getItem('glimmind_guest_user');
    if (guestUser) {
      setUser(JSON.parse(guestUser));
      setLoading(false);
      return;
    }

    if (isConfigured && auth) {
      return onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setLists([]);
      return;
    }

    if (user.uid.startsWith('guest-')) {
      const savedLists = localStorage.getItem(`glimmind_lists_${user.uid}`);
      if (savedLists) {
        setLists(JSON.parse(savedLists));
      } else {
        setLists([SAMPLE_LIST]);
        localStorage.setItem(`glimmind_lists_${user.uid}`, JSON.stringify([SAMPLE_LIST]));
      }
      return;
    }

    if (isConfigured && db) {
      const q = query(collection(db, "lists"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedLists = snapshot.docs.map(doc => doc.data() as AssociationList);
        setLists(fetchedLists);
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleCreateList = async (name: string, concept: string, initialAssociations: Association[] = []) => {
    if (!user) return;
    const newList: AssociationList = {
      id: crypto.randomUUID(),
      userId: user.uid,
      name,
      concept,
      associations: initialAssociations,
      settings: {
        mode: 'training',
        flipOrder: 'normal',
        threshold: 0.95
      },
      createdAt: Date.now()
    };

    if (user.uid.startsWith('guest-')) {
      const updatedLists = [...lists, newList];
      setLists(updatedLists);
      localStorage.setItem(`glimmind_lists_${user.uid}`, JSON.stringify(updatedLists));
    } else if (isConfigured && db) {
      await setDoc(doc(db, "lists", newList.id), newList);
    }

    setSelectedListId(newList.id);
    setView('editor');
  };

  const handleUpdateList = async (updatedList: AssociationList) => {
    if (user.uid.startsWith('guest-')) {
      const updatedLists = lists.map(l => l.id === updatedList.id ? updatedList : l);
      setLists(updatedLists);
      localStorage.setItem(`glimmind_lists_${user.uid}`, JSON.stringify(updatedLists));
    } else if (isConfigured && db) {
      await setDoc(doc(db, "lists", updatedList.id), updatedList);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!confirm('¿Seguro que quieres borrar esta lista?')) return;
    
    if (user.uid.startsWith('guest-')) {
      const updatedLists = lists.filter(l => l.id !== id);
      setLists(updatedLists);
      localStorage.setItem(`glimmind_lists_${user.uid}`, JSON.stringify(updatedLists));
    } else if (isConfigured && db) {
      await deleteDoc(doc(db, "lists", id));
    }
  };

  const handleLoginDev = () => {
    localStorage.setItem('glimmind_guest_user', JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
  };

  const handleLogout = async () => {
    if (user.uid.startsWith('guest-')) {
      localStorage.removeItem('glimmind_guest_user');
      setUser(null);
    } else if (isConfigured && auth) {
      await auth.signOut();
    }
    setView('dashboard');
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      <div className="font-bold text-indigo-600 animate-pulse">Cargando Glimmind...</div>
    </div>
  );

  if (!user) return <Auth onLoginDev={handleLoginDev} />;

  const currentList = lists.find(l => l.id === selectedListId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="bg-white border-b px-4 md:px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setView('dashboard'); setShowGameSettings(false); }}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold shadow-indigo-200 shadow-lg">G</div>
          <h1 className="text-lg md:text-xl font-black text-gray-800 tracking-tight">Glimmind</h1>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          {view === 'game' && (
            <button 
              onClick={() => setShowGameSettings(true)}
              className="p-2 text-gray-400 hover:text-indigo-600 transition hover:bg-slate-50 rounded-lg active:scale-90"
              title="Opciones de juego"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <div className="hidden md:block text-right">
            <div className="text-xs font-bold text-gray-900">{user.displayName}</div>
            <div className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">
              {user.uid.startsWith('guest-') ? 'Modo Invitado' : 'Sincronizado'}
            </div>
          </div>
          <img src={user.photoURL} className="w-8 h-8 rounded-full border shadow-sm" alt="Avatar" />
          <button onClick={handleLogout} className="text-gray-400 hover:text-red-500 text-sm font-medium transition p-2 rounded-lg hover:bg-red-50">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          </button>
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
          <ListEditor list={currentList} onSave={handleUpdateList} onBack={() => setView('dashboard')} />
        )}
        {view === 'game' && currentList && (
          <GameView 
            list={currentList} 
            onUpdateList={handleUpdateList} 
            onBack={() => { setView('dashboard'); setShowGameSettings(false); }} 
            showSettings={showGameSettings}
            setShowSettings={setShowGameSettings}
          />
        )}
      </main>
    </div>
  );
};

export default App;
