"use client";

import React, { useState, useEffect } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { GameView } from '@/components/GameView';
import { ListEditor } from '@/components/ListEditor';
import { Auth } from '@/components/Auth';
import { AssociationList, Association, AssociationStatus } from '@/lib/types';
import { auth, db, onAuthStateChanged, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, isConfigured } from '@/lib/firebase';

const MOCK_USER = {
  uid: 'guest-user-123',
  displayName: 'Invitado (Modo Local)',
  photoURL: 'https://ui-avatars.com/api/?name=Guest+User&background=6366f1&color=fff'
};

export default function Home() {
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
      if (savedLists) setLists(JSON.parse(savedLists));
      return;
    }

    if (isConfigured && db) {
      const q = query(collection(db, "lists"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setLists(snapshot.docs.map(doc => doc.data() as AssociationList));
      });
      return () => unsubscribe();
    }
  }, [user]);

  const handleUpdateList = async (updatedList: AssociationList) => {
    if (user.uid.startsWith('guest-')) {
      const updatedLists = lists.map(l => l.id === updatedList.id ? updatedList : l);
      if (!lists.find(l => l.id === updatedList.id)) updatedLists.push(updatedList);
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

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!user) return <Auth onLoginDev={() => {
    localStorage.setItem('glimmind_guest_user', JSON.stringify(MOCK_USER));
    setUser(MOCK_USER);
  }} />;

  const currentList = lists.find(l => l.id === selectedListId);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setView('dashboard')}>
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-indigo-100">G</div>
          <h1 className="text-xl font-black tracking-tight text-slate-900">Glimmind</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {view === 'game' && (
            <button 
              onClick={() => setShowGameSettings(true)}
              className="p-2 text-slate-400 hover:text-indigo-600 transition bg-slate-50 rounded-lg active:scale-90"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          <img src={user.photoURL} className="w-8 h-8 rounded-full ring-2 ring-indigo-50" alt="Profile" />
          <button onClick={() => { auth?.signOut(); localStorage.removeItem('glimmind_guest_user'); setUser(null); }} className="text-slate-400 hover:text-red-500">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
          </button>
        </div>
      </header>

      <main className="flex-1">
        {view === 'dashboard' && (
          <Dashboard 
            lists={lists} 
            onCreate={(name, concept, initialAssocs) => {
              // Fix: Explicitly type newList as AssociationList to ensure correct inference of literal types like GameMode
              const newList: AssociationList = {
                id: crypto.randomUUID(), 
                userId: user.uid, 
                name, 
                concept, 
                associations: initialAssocs, 
                settings: { 
                  mode: 'training', 
                  flipOrder: 'normal', 
                  threshold: 0.95 
                }, 
                createdAt: Date.now()
              };
              handleUpdateList(newList);
              setSelectedListId(newList.id);
              setView('game');
            }} 
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
            onBack={() => setView('dashboard')} 
            showSettings={showGameSettings}
            setShowSettings={setShowGameSettings}
          />
        )}
      </main>
    </div>
  );
}