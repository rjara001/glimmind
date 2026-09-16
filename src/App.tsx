import React, { useCallback } from 'react';
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
import { useNavigation } from './hooks/app/useNavigation';
import { useAppHandlers } from './hooks/app/useAppHandlers';
import { GUEST_UID } from './constants/app';
import { splitAssociationsByMax } from './utils/splitAssociations';
import type { AppUser } from './types';
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
  const { view, navigate, goBack, isReturningToGame } = useNavigation();
  const { lastPlayedId, setLastPlayedId } = useAppBootstrap(navigate);

  const handlers = useAppHandlers({ navigate, showToast, setLastPlayedId });

  // Wrapper functions to match DashboardProps interface
  const handleCreate = useCallback(
    async (name: string, concept: string, initialAssociations: Association[]) => {
      const id = await handlers.handleCreateList(name, concept, initialAssociations);
      if (id) {
        useGameStore.getState().setCurrentList(id);
        navigate('editor');
      }
    },
    [handlers.handleCreateList, navigate]
  );

  // Create mode state - holds the draft list before saving
  const [createModeList, setCreateModeList] = React.useState<AssociationList | null>(null);

  // Navigate to editor in create mode - user will create list on first save
  const handleCreateEmpty = useCallback(() => {
    const emptyList: AssociationList = {
      id: '', // Empty ID indicates create mode
      userId: handlers.currentList?.userId || '',
      name: '',
      concept: 'Valor 1 / Valor 2',
      associations: [],
      isArchived: false,
      settings: {
        mode: 'training',
        flipOrder: 'normal',
        threshold: 0.95,
        ignoreArticles: true,
        showHints: true,
        autoRevealAfterSeconds: 15,
        autoAdvanceAfterAttempts: 3,
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setCreateModeList(emptyList);
    navigate('editor');
  }, [navigate, handlers.currentList]);

  const handleCreateAndPlay = useCallback(
    (name: string, concept: string, initialAssociations: Association[]) => {
      handlers.handleCreateListAndPlay(name, concept, initialAssociations);
    },
    [handlers.handleCreateListAndPlay]
  );

  const handleAddDeck = useCallback(
    async (name: string, concept: string, initialAssociations: Association[]) => {
      await handlers.handleAddDeck({ name, associations: initialAssociations, concept });
    },
    [handlers.handleAddDeck]
  );

  const handleUpdateAssociations = useCallback(
    async (updatedAssociations: Association[]) => {
      await handlers.handleUpdateAssociations(updatedAssociations);
    },
    [handlers.handleUpdateAssociations]
  );

  const user = useGameStore((state) => state.user);
  const setUser = useGameStore((state) => state.setUser);
  const isLoaded = useGameStore((state) => state.isLoaded);
  const lists = useGameStore((state) => state.lists);
  const celebration = useGameStore((state) => state.celebration);
  const clearCelebration = useGameStore((state) => state.clearCelebration);
  const setCurrentList = useGameStore((state) => state.setCurrentList);

  const [showQuickAdd, setShowQuickAdd] = React.useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = React.useState(false);
  const [youtubePreviewResult, setYoutubePreviewResult] = React.useState<VocabularyResult | null>(null);
  const [pendingYouTube, setPendingYouTube] = React.useState<{ chunks: Association[][]; deckNames: string[]; sourceMeta: VocabularySourceMeta } | null>(null);
  const [pendingTextImport, setPendingTextImport] = React.useState<{ chunks: Association[][]; deckNames: string[]; sourceMeta: VocabularySourceMeta } | null>(null);
  const [pendingEditId, setPendingEditId] = React.useState<string | null>(null);

  const handleLogout = useCallback(async () => {
    try {
      await auth?.signOut();
    } catch {
      showToast('Failed to sign out. Please try again.', 'error');
    } finally {
      setUser(null);
    }
  }, [setUser, showToast]);

  React.useEffect(() => {
    if (view === 'editor' && pendingYouTube) {
      const { chunks, deckNames, sourceMeta: _sourceMeta } = pendingYouTube;
      const settings = useGameStore.getState().settings;
      const maxCardsPerDeck = settings?.maxCardsPerDeck || 150;

      const allAssociations = chunks.flat();
      const { chunks: splitChunks, deckNames: splitDeckNames } = splitAssociationsByMax(
        allAssociations,
        maxCardsPerDeck,
        deckNames[0] || 'Deck'
      );

      // Create the first deck and then split if needed
      const firstChunk = splitChunks[0];
      handlers.handleCreateList(
        splitDeckNames[0],
        'value1 / value2',
        firstChunk,
        {
          mode: 'training',
          flipOrder: 'normal',
          threshold: 0.95,
          ignoreArticles: true,
          showHints: true,
          autoRevealAfterSeconds: 15,
          autoAdvanceAfterAttempts: 3,
        }
      ).then((firstId) => {
        if (firstId && splitChunks.length > 1) {
          // Create remaining decks
          const groups = splitChunks.slice(1).map((chunk, i) => ({
            name: splitDeckNames[i + 1],
            associations: chunk,
          }));
          handlers.handleCreateMultipleLists(groups, firstId);
        }
        if (firstId) {
          setCurrentList(firstId);
        }
        setPendingYouTube(null);
      });
    }
  }, [view, pendingYouTube, user, lists, handlers, setCurrentList]);

  React.useEffect(() => {
    if (view === 'editor' && pendingTextImport) {
      const { chunks, deckNames, sourceMeta: _sourceMeta } = pendingTextImport;
      const settings = useGameStore.getState().settings;
      const maxCardsPerDeck = settings?.maxCardsPerDeck || 150;

      const allAssociations = chunks.flat();
      const { chunks: splitChunks, deckNames: splitDeckNames } = splitAssociationsByMax(
        allAssociations,
        maxCardsPerDeck,
        deckNames[0] || 'Importado'
      );

      const firstChunk = splitChunks[0];
      handlers.handleCreateList(
        splitDeckNames[0],
        'value1 / value2',
        firstChunk,
        {
          mode: 'training',
          flipOrder: 'normal',
          threshold: 0.95,
          ignoreArticles: true,
          showHints: true,
          autoRevealAfterSeconds: 15,
          autoAdvanceAfterAttempts: 3,
        }
      ).then((firstId) => {
        if (firstId && splitChunks.length > 1) {
          const groups = splitChunks.slice(1).map((chunk, i) => ({
            name: splitDeckNames[i + 1],
            associations: chunk,
          }));
          handlers.handleCreateMultipleLists(groups, firstId);
        }
        if (firstId) {
          setCurrentList(firstId);
        }
        setPendingTextImport(null);
      });
    }
  }, [view, pendingTextImport, user, lists, handlers, setCurrentList]);

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
          onSync={handlers.handleSyncFromCloud}
          isSyncing={handlers.isSyncing}
          onNavigate={navigate as (view: string) => void}
          onLogout={handleLogout}
        />
        {isGuest && <GuestBanner onDismiss={() => {}} />}

        <main className="max-w-7xl mx-auto px-4 py-6">
          {view === 'dashboard' && (
            <Dashboard
              lists={lists}
              lastPlayedId={lastPlayedId}
              onCreate={handleCreate}
              onCreateAndPlay={handleCreateAndPlay}
              onAddDeck={handleAddDeck}
              onDelete={handlers.handleDeleteList}
              onEdit={(id) => {
                useGameStore.getState().setCurrentList(id);
                navigate('editor');
              }}
              onPlay={handlers.handlePlayList}
              onYouTubeSuccess={(result) => setYoutubePreviewResult(result)}
              onTextImport={() => navigate('text-importer')}
              onCreateEmpty={handleCreateEmpty}
            />
          )}
          {view === 'editor' && (handlers.currentList || createModeList) && (
            <ListEditor
              list={createModeList || handlers.currentList!}
              initialEditId={pendingEditId}
              onInitialEditConsumed={() => setPendingEditId(null)}
              onSave={handlers.handleUpdateList}
              onBack={() => {
                setCreateModeList(null);
                goBack();
              }}
              onBackLabel={isReturningToGame ? 'Volver al juego' : 'Volver al dashboard'}
              onCreateMultiple={handlers.handleCreateMultipleLists}
              isCreateMode={!!createModeList}
              onCreateList={handlers.handleCreateList}
            />
          )}
          {view === 'game' && handlers.currentList && (
            <GameView
              list={handlers.currentList}
              onUpdateAssociations={handleUpdateAssociations}
              onUpdateList={handlers.handleUpdateList}
              onBack={goBack}
              onViewList={(id) => {
                setPendingEditId(id ?? null);
                navigate('editor');
              }}
            />
          )}
          {view === 'settings' && (
            <SettingsView onBack={goBack} />
          )}
          {view === 'activity' && (
            <HistoryView onBack={goBack} onGoToSettings={() => navigate('settings')} />
          )}
          {view === 'reports' && (
            <ReportsView onBack={goBack} onGoToSettings={() => navigate('settings')} />
          )}
          {view === 'admin' && (
            <AdminUsageView onBack={goBack} />
          )}
          {view === 'text-importer' && (
            <TextImporter
              onSave={(associations, sourceMeta) => {
                setPendingTextImport({
                  chunks: [associations],
                  deckNames: [sourceMeta.title || 'Importado'],
                  sourceMeta,
                });
                navigate('editor');
              }}
              onBack={goBack}
            />
          )}
        </main>

        {showQuickAdd && (
          <QuickAddModal
            lists={lists}
            onAdd={handlers.handleQuickAdd}
            onCreateList={handlers.handleCreateListQuick}
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
              setPendingYouTube({
                chunks: [associations],
                deckNames: [sourceMeta.title || 'Sin nombre'],
                sourceMeta,
              });
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