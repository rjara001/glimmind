import React, { useState, useCallback } from 'react';
import { Dashboard } from './components/views/Dashboard';
import { GameView } from './components/views/GameView';
import { ListEditor } from './components/ListEditor';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { SettingsView } from './components/views/SettingsView';
import { HistoryView } from './components/views/HistoryView';
import { ReportsView } from './components/views/ReportsView';
import { Auth } from './components/Auth';
import { ToastProvider, useToast } from './components/layout/Toast';
import { CelebrationOverlay } from './components/layout/CelebrationOverlay';
import { AppHeader } from './components/layout/AppHeader';
import { useGameStore } from './store/gameStore';
import { auth } from './firebase';
import { VoskModelProvider } from './context/VoskModelContext';
import { useAppBootstrap } from './hooks/app/useAppBootstrap';
import { useAppActions } from './hooks/app/useAppActions';
import { GUEST_ID } from './constants/app';
import type { AppView } from './types/app';

const MOCK_USER = {
  uid: GUEST_ID,
  displayName: 'Local Guest',
  photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff',
};

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<AppView>('dashboard');
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const navigate = useCallback((nextView: string) => {
    setView(nextView as AppView);
  }, []);

  const user = useGameStore((state) => state.user);
  const setUser = useGameStore((state) => state.setUser);
  const isLoaded = useGameStore((state) => state.isLoaded);
  const lists = useGameStore((state) => state.lists);
  const celebration = useGameStore((state) => state.celebration);
  const clearCelebration = useGameStore((state) => state.clearCelebration);

  const { lastPlayedId, setLastPlayedId } = useAppBootstrap(navigate);

  const {
    isSyncing,
    currentList,
    handleSyncFromCloud,
    handleUpdateAssociations,
    handlePlayList,
    handleQuickAdd,
    handleUpdateList,
    handleCreateList,
    handleDeleteList,
    handleCreateMultipleLists,
  } = useAppActions({ navigate, showToast, setLastPlayedId });

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
        <AppHeader
          view={view}
          user={user}
          onShowQuickAdd={() => setShowQuickAdd(true)}
          onSync={handleSyncFromCloud}
          isSyncing={isSyncing}
          onNavigate={navigate}
          onLogout={() => {
            auth?.signOut();
            setUser(null);
            navigate('dashboard');
          }}
        />

        <main className="max-w-7xl mx-auto px-4 py-6">
          {view === 'dashboard' && (
            <Dashboard
              lists={lists}
              lastPlayedId={lastPlayedId}
              onCreate={handleCreateList}
              onDelete={handleDeleteList}
              onEdit={(id) => {
                useGameStore.getState().setCurrentList(id);
                navigate('editor');
              }}
              onPlay={handlePlayList}
            />
          )}
          {view === 'editor' && currentList && (
            <ListEditor
              list={currentList}
              onSave={handleUpdateList}
              onBack={() => navigate('dashboard')}
              onCreateMultiple={handleCreateMultipleLists}
            />
          )}
          {view === 'game' && currentList && (
            <GameView
              list={currentList}
              onUpdateAssociations={handleUpdateAssociations}
              onUpdateList={handleUpdateList}
              onBack={() => navigate('dashboard')}
            />
          )}
          {view === 'settings' && (
            <SettingsView onBack={() => navigate('dashboard')} />
          )}
          {view === 'activity' && (
            <HistoryView onBack={() => navigate('dashboard')} onGoToSettings={() => navigate('settings')} />
          )}
          {view === 'reports' && (
            <ReportsView onBack={() => navigate('dashboard')} onGoToSettings={() => navigate('settings')} />
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
      <VoskModelProvider>
        <AppContent />
      </VoskModelProvider>
    </ToastProvider>
  );
};

export default AppWrapper;