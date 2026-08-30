import React, { useState, useCallback } from 'react';
import { Dashboard } from './components/views/Dashboard';
import { GameView } from './components/views/GameView';
import { ListEditor } from './components/ListEditor';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { SettingsView } from './components/views/SettingsView';
import { HistoryView } from './components/views/HistoryView';
import { ReportsView } from './components/views/ReportsView';
import { AdminUsageView } from './components/views/AdminUsageView';
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
import type { VocabularyResult } from './types/youtube-deck';
import type { Association, AssociationList } from './types';
import { VocabularyPreview } from './components/modals/VocabularyPreview';
import { CreateYouTubeDeckModal } from './components/modals/CreateYouTubeDeckModal';
import { TextImporter } from './components/views/TextImporter';
import type { VocabularySourceMeta } from './components/modals/VocabularyPreview';

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
  const [showYouTubeModal, setShowYouTubeModal] = useState(false);
  const [youtubePreviewResult, setYoutubePreviewResult] = useState<VocabularyResult | null>(null);
  const [pendingYouTube, setPendingYouTube] = useState<{ associations: Association[]; sourceMeta: VocabularySourceMeta } | null>(null);
  const [pendingTextImport, setPendingTextImport] = useState<{ associations: Association[]; sourceMeta: VocabularySourceMeta } | null>(null);

  const navigate = useCallback((nextView: string) => {
    if (nextView === 'dashboard') {
      useGameStore.getState().setCurrentList(null);
    }
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
    handleCreateListAndPlay,
    handleAddDeck,
  } = useAppActions({ navigate, showToast, setLastPlayedId });

  const handleLogout = useCallback(async () => {
    try {
      await auth?.signOut();
    } catch {
      showToast('Failed to sign out. Please try again.', 'error');
    } finally {
      // Clear local user state explicitly. On mobile (Capacitor webview),
      // onAuthStateChanged does not reliably fire with null after signOut,
      // so we cannot depend on it to reset the UI.
      setUser(null);
    }
  }, [setUser, showToast]);

  React.useEffect(() => {
    if (view === 'editor' && pendingYouTube) {
      const { sourceRow, sourceUrl } = pendingYouTube.sourceMeta;
      const tempList: AssociationList = {
        id: `temp_${Date.now()}`,
        userId: user?.uid || GUEST_UID,
        name: pendingYouTube.sourceMeta.title || `YouTube - ${sourceRow?.videoTitle || sourceUrl || 'Deck'}`,
        concept: 'value1 / value2',
        associations: pendingYouTube.associations,
        isArchived: false,
        sourceType: pendingYouTube.sourceMeta.sourceType,
        sourceUrl: pendingYouTube.sourceMeta.sourceUrl,
        rawSourceText: pendingYouTube.sourceMeta.rawSourceText,
        sourceRow: pendingYouTube.sourceMeta.sourceRow,
        settings: {
          mode: 'training',
          flipOrder: 'normal',
          threshold: 0.95,
          ignoreArticles: true,
          showHints: true,
          autoRevealAfterSeconds: 15,
          autoAdvanceAfterAttempts: 3,
        },
      };
      useGameStore.getState().setCurrentList(tempList.id);
      useGameStore.getState().setLists([...lists, tempList]);
      setPendingYouTube(null);
    }
  }, [view, pendingYouTube, user, lists]);

  React.useEffect(() => {
    if (view === 'editor' && pendingTextImport) {
      const tempList: AssociationList = {
        id: `temp_${Date.now()}`,
        userId: user?.uid || GUEST_UID,
        name: pendingTextImport.sourceMeta.title || `Texto Libre - ${(pendingTextImport.sourceMeta.rawSourceText || '').slice(0, 40) || 'Deck'}`,
        concept: 'value1 / value2',
        associations: pendingTextImport.associations,
        isArchived: false,
        sourceType: 'raw_text',
        sourceUrl: undefined,
        rawSourceText: pendingTextImport.sourceMeta.rawSourceText,
        sourceRow: undefined,
        settings: {
          mode: 'training',
          flipOrder: 'normal',
          threshold: 0.95,
          ignoreArticles: true,
          showHints: true,
          autoRevealAfterSeconds: 15,
          autoAdvanceAfterAttempts: 3,
        },
      };
      useGameStore.getState().setCurrentList(tempList.id);
      useGameStore.getState().setLists([...lists, tempList]);
      setPendingTextImport(null);
    }
  }, [view, pendingTextImport, user, lists]);

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
              onCreateAndPlay={handleCreateListAndPlay}
              onAddDeck={handleAddDeck}
              onDelete={handleDeleteList}
              onEdit={(id) => {
                useGameStore.getState().setCurrentList(id);
                navigate('editor');
              }}
              onPlay={handlePlayList}
              onYouTubeSuccess={(result) => setYoutubePreviewResult(result)}
              onTextImport={() => navigate('text-importer')}
            />
          )}
          {view === 'editor' && currentList && (
            <ListEditor
              list={currentList}
              onSave={handleUpdateList}
              onBack={() => {
                useGameStore.getState().setCurrentList(null);
                navigate('dashboard');
              }}
              onCreateMultiple={handleCreateMultipleLists}
            />
          )}
          {view === 'game' && currentList && (
            <GameView
              list={currentList}
              onUpdateAssociations={handleUpdateAssociations}
              onUpdateList={handleUpdateList}
              onBack={() => navigate('dashboard')}
              onViewList={() => navigate('editor')}
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
          {view === 'admin' && (
            <AdminUsageView onBack={() => navigate('dashboard')} />
          )}
          {view === 'text-importer' && (
            <TextImporter
              onSave={(associations, sourceMeta) => {
                setPendingTextImport({ associations, sourceMeta });
                navigate('editor');
              }}
              onBack={() => navigate('dashboard')}
            />
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
        {youtubePreviewResult && (
          <VocabularyPreview
            result={youtubePreviewResult}
            onClose={() => {
              setYoutubePreviewResult(null);
            }}
            onAccept={(associations, sourceMeta) => {
              setYoutubePreviewResult(null);
              setPendingYouTube({ associations, sourceMeta });
              navigate('editor');
            }}
          />
        )}
        {showYouTubeModal && (
          <CreateYouTubeDeckModal
            onClose={() => setShowYouTubeModal(false)}
            onSuccess={(result) => {
              setShowYouTubeModal(false);
              setYoutubePreviewResult(result);
            }}
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