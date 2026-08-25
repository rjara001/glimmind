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
import { GuestBanner } from './components/layout/GuestBanner';
import { useGameStore } from './store/gameStore';
import { auth } from './firebase';
import { VoskModelProvider } from './context/VoskModelContext';
import { useAppBootstrap } from './hooks/app/useAppBootstrap';
import { useAppActions } from './hooks/app/useAppActions';
import { GUEST_UID } from './constants/app';
import type { AppUser } from './types';
import type { AppView } from './types/app';

const MOCK_USER: AppUser = {
  uid: GUEST_UID,
  displayName: 'Local Guest',
  email: null,
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
    handleCreateListQuick,
    handleDeleteList,
    handleCreateMultipleLists,
  } = useAppActions({ navigate, showToast, setLastPlayedId });

  const handleLogout = useCallback(async () => {
    try {
      await auth?.signOut();
      // onAuthStateChanged will call setUser(null) → isLoaded=false → Auth screen renders
    } catch {
      showToast('Failed to sign out. Please try again.', 'error');
    }
  }, [showToast]);

  if (!isLoaded) {
    return (
      <ToastProvider>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm font-medium text-slate-400">Loading...</span>
          </div>
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

  const isGuest = user?.uid === GUEST_UID;

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
          onLogout={handleLogout}
        />
        {isGuest && <GuestBanner onDismiss={() => {}} />}

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
            onCreateList={handleCreateListQuick}
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