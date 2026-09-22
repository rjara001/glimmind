import React, { useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './components/views/Dashboard';
import { GameView } from './components/views/GameView';
import { ListEditor } from './components/ListEditor';
import { QuickAddModal } from './components/modals/QuickAddModal';
import { SettingsView } from './components/views/SettingsView';
import { HistoryView } from './components/views/HistoryView';
import { ReportsView } from './components/views/ReportsView';
import { AdminUsageView } from './components/views/AdminUsageView';
import { ToastProvider, useToast } from './components/layout/Toast';
import { CelebrationOverlay } from './components/layout/CelebrationOverlay';
import { GuestBanner } from './components/layout/GuestBanner';
import { Navbar } from './components/Navbar';
import { Auth } from './components/Auth';
import { useGameStore } from './store/gameStore';
import { VoskModelProvider } from './context/VoskModelContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAppBootstrap } from './hooks/app/useAppBootstrap';
import { useNavigation } from './hooks/app/useNavigation';
import { useAppHandlers } from './hooks/app/useAppHandlers';
import { GUEST_UID } from './constants/app';
import { splitAssociationsByMax } from './utils/splitAssociations';
import type { Association, AssociationList } from './types';
import { VocabularyPreview } from './components/modals/VocabularyPreview';
import { CreateYouTubeDeckModal } from './components/modals/CreateYouTubeDeckModal';
import { TextImporter } from './components/views/TextImporter';
import type { VocabularyResult } from './types/youtube-deck';
import type { VocabularySourceMeta } from './components/modals/VocabularyPreview';

const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const { user, logout, setUser } = useAuth();
  const { view, navigate, goBack, isReturningToGame } = useNavigation();
  const { lastPlayedId, setLastPlayedId } = useAppBootstrap(navigate);

  const handlers = useAppHandlers({ navigate, showToast, setLastPlayedId });

  const handleLoginDev = useCallback(() => {
    setUser({
      uid: GUEST_UID,
      displayName: 'Local Guest',
      email: null,
      photoURL: 'https://ui-avatars.com/api/?name=Guest&background=10b981&color=fff',
    });
  }, [setUser]);

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

  const [showQuickAdd, setShowQuickAdd] = React.useState(false);
  const [showYouTubeModal, setShowYouTubeModal] = React.useState(false);
  const [youtubePreviewResult, setYoutubePreviewResult] = React.useState<VocabularyResult | null>(null);
  const [pendingYouTube, setPendingYouTube] = React.useState<{ chunks: Association[][]; deckNames: string[]; sourceMeta: VocabularySourceMeta } | null>(null);
  const [pendingTextImport, setPendingTextImport] = React.useState<{ chunks: Association[][]; deckNames: string[]; sourceMeta: VocabularySourceMeta } | null>(null);
  const [pendingEditId, setPendingEditId] = React.useState<string | null>(null);

  // Navigate to editor in create mode - user will create list on first save
  const handleCreateEmpty = useCallback(() => {
    useGameStore.getState().setCurrentList(null);
    const emptyList: AssociationList = {
      id: '',
      userId: '',
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
  }, [navigate]);

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

  const onSaveList = useCallback(
    async (updatedList: AssociationList) => {
      await handlers.handleUpdateList(updatedList);
      setCreateModeList(null);
    },
    [handlers.handleUpdateList, setCreateModeList],
  );

  const onBackFromEditor = useCallback(() => {
    setCreateModeList(null);
    goBack();
  }, [goBack, setCreateModeList]);

  const isLoaded = useGameStore((state) => state.isLoaded);
  const lists = useGameStore((state) => state.lists);
  const celebration = useGameStore((state) => state.celebration);
  const clearCelebration = useGameStore((state) => state.clearCelebration);
  const setCurrentList = useGameStore((state) => state.setCurrentList);

  React.useEffect(() => {
    if (view === 'editor' && pendingYouTube) {
      (async () => {
        const { chunks, deckNames, sourceMeta: _sourceMeta } = pendingYouTube;
        const settings = useGameStore.getState().settings;
        const maxCardsPerDeck = settings?.maxCardsPerDeck || 150;

        const allAssociations = chunks.flat();
        const { chunks: splitChunks, deckNames: splitDeckNames } = splitAssociationsByMax(
          allAssociations,
          maxCardsPerDeck,
          deckNames[0] || 'Deck'
        );

        const defaultSettings = {
          mode: 'training' as const,
          flipOrder: 'normal' as const,
          threshold: 0.95,
          ignoreArticles: true,
          showHints: true,
          autoRevealAfterSeconds: 15,
          autoAdvanceAfterAttempts: 3,
        };

        let firstId: string | null = null;
        for (let i = 0; i < splitChunks.length; i++) {
          const id = await handlers.handleCreateList(
            splitDeckNames[i],
            'value1 / value2',
            splitChunks[i],
            defaultSettings,
          );
          if (i === 0) firstId = id;
          if (!id) break;
        }

        if (firstId) {
          setCurrentList(firstId);
        }
        setPendingYouTube(null);
      })();
    }
  }, [view, pendingYouTube, user, lists, handlers, setCurrentList]);

  React.useEffect(() => {
    if (view === 'editor' && pendingTextImport) {
      (async () => {
        const { chunks, deckNames, sourceMeta: _sourceMeta } = pendingTextImport;
        const settings = useGameStore.getState().settings;
        const maxCardsPerDeck = settings?.maxCardsPerDeck || 150;

        const allAssociations = chunks.flat();
        const { chunks: splitChunks, deckNames: splitDeckNames } = splitAssociationsByMax(
          allAssociations,
          maxCardsPerDeck,
          deckNames[0] || 'Importado'
        );

        const defaultSettings = {
          mode: 'training' as const,
          flipOrder: 'normal' as const,
          threshold: 0.95,
          ignoreArticles: true,
          showHints: true,
          autoRevealAfterSeconds: 15,
          autoAdvanceAfterAttempts: 3,
        };

        let firstId: string | null = null;
        for (let i = 0; i < splitChunks.length; i++) {
          const id = await handlers.handleCreateList(
            splitDeckNames[i],
            'value1 / value2',
            splitChunks[i],
            defaultSettings,
          );
          if (i === 0) firstId = id;
          if (!id) break;
        }

        if (firstId) {
          setCurrentList(firstId);
        }
        setPendingTextImport(null);
      })();
    }
  }, [view, pendingTextImport, user, lists, handlers, setCurrentList]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm font-medium text-slate-400">Loading...</span>
        </div>
      </div>
    );
  }

  const isGuest = user?.uid === GUEST_UID;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar onNavigate={navigate as (view: string) => void} onLogout={logout} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {isGuest && <GuestBanner onDismiss={() => {}} />}

        <Routes>
          <Route
            path="/login"
            element={
              user
                ? <Navigate to="/dashboard" replace />
                : <Auth onLoginDev={handleLoginDev} />
            }
          />
<Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard
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
              </ProtectedRoute>
            }
          />
          <Route
            path="/editor"
            element={
              <ProtectedRoute>
                {(createModeList || handlers.currentList) ? (
                  <ListEditor
                    list={createModeList || handlers.currentList!}
                    initialEditId={pendingEditId}
                    onInitialEditConsumed={() => setPendingEditId(null)}
                    onSave={onSaveList}
                    onBack={onBackFromEditor}
                    onBackLabel={isReturningToGame ? 'Volver al juego' : 'Volver al dashboard'}
                    onCreateMultiple={handlers.handleCreateMultipleLists}
                    isCreateMode={!!createModeList}
                    onCreateList={handlers.handleCreateList}
                  />
                ) : (
                  <Navigate replace to="/dashboard" />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/game"
            element={
              <ProtectedRoute>
                {handlers.currentList ? (
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
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="w-8 h-8 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span className="text-sm text-slate-400">Loading deck...</span>
                    </div>
                  </div>
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsView onBack={goBack} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <HistoryView onBack={goBack} onGoToSettings={() => navigate('settings')} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <ReportsView onBack={goBack} onGoToSettings={() => navigate('settings')} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['owner', 'admin']}>
                <AdminUsageView onBack={goBack} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/text-importer"
            element={
              <ProtectedRoute>
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
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
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
  );
};

const AppWrapper: React.FC = () => {
  return (
    <ToastProvider>
      <BrowserRouter>
        <AuthProvider>
          <VoskModelProvider>
            <AppContent />
          </VoskModelProvider>
        </AuthProvider>
      </BrowserRouter>
    </ToastProvider>
  );
};

export default AppWrapper;