import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '@/components/views/Dashboard';
import { useGameStore } from '@/store/gameStore';
import { ToastProvider } from '@/components/layout/Toast';
import { createInitialBootstrapStatus } from '@/types/bootstrap-status';
import type { BootstrapPart, LoadPhase } from '@/types/bootstrap-status';
import type { AssociationList } from '@/types';

const baseProps = {
  onCreate: vi.fn(),
  onCreateAndPlay: vi.fn(),
  onAddDeck: vi.fn(async () => undefined),
  onDelete: vi.fn(),
  onEdit: vi.fn(),
  onPlay: vi.fn(),
  onCreateEmpty: vi.fn(),
};

function makeList(id: string): AssociationList {
  return {
    id,
    userId: 'user-1',
    name: `Deck ${id}`,
    concept: 'term / definition',
    associations: [
      {
        id: `${id}-c1`,
        term: 'hola',
        definition: ['hello'],
        currentCycle: 1,
        status: 'pending',
        isLearned: false,
        isArchived: false,
      },
    ],
    isArchived: false,
    settings: {
      mode: 'training',
      flipOrder: 'normal',
      threshold: 0.95,
      ignoreArticles: true,
      showHints: true,
    },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  } as AssociationList;
}

function renderDashboard() {
  return render(
    <ToastProvider>
      <Dashboard {...baseProps} />
    </ToastProvider>
  );
}

function setBootstrap(listsPhase: LoadPhase, overrides: Record<string, unknown> = {}) {
  useGameStore.setState({
    user: { uid: 'user-1', displayName: 'Test', email: 't@e.com', photoURL: null },
    lists: [],
    quota: null,
    currentListId: null,
    currentList: null,
    bootstrapStatus: { ...createInitialBootstrapStatus(), lists: listsPhase },
    ...overrides,
  });
}

describe('Dashboard bootstrap visibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      bootstrapStatus: createInitialBootstrapStatus(),
      lists: [],
      quota: null,
      progress: null,
    });
  });

  it('shows the loading spinner instead of the onboarding while getLists runs', () => {
    setBootstrap('loading');

    renderDashboard();

    expect(screen.getByRole('status')).toHaveTextContent('Cargando mazos…');
    expect(screen.queryByText('¡Bienvenido a tu Tienda de Barajas!')).toBeNull();
  });

  it('shows a retryable error when getLists failed and there is no local cache', async () => {
    const retrySpy = vi.fn(async (_part: BootstrapPart) => undefined);
    setBootstrap('error', {
      retryBootstrapPart: retrySpy,
      bootstrapStatus: {
        ...createInitialBootstrapStatus(),
        lists: 'error',
        error: 'HTTP 500',
      },
    });

    renderDashboard();

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron actualizar tus mazos');
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(retrySpy).toHaveBeenCalledWith('lists');
  });

  it('keeps the onboarding when the load finished and the account has no decks', () => {
    setBootstrap('loaded');

    renderDashboard();

    expect(screen.getByText('¡Bienvenido a tu Tienda de Barajas!')).toBeTruthy();
  });

  it('shows the quota spinner while getQuota is in flight', () => {
    setBootstrap('loaded', {
      lists: [makeList('deck-1')],
      bootstrapStatus: { ...createInitialBootstrapStatus(), lists: 'loaded', quota: 'loading' },
    });

    renderDashboard();

    expect(screen.getAllByText('Calculando límites…').length).toBeGreaterThan(0);
  });

  it('renders the per-call sync chips once the load settled', () => {
    setBootstrap('loaded', {
      lists: [makeList('deck-1')],
      bootstrapStatus: {
        ...createInitialBootstrapStatus(),
        lists: 'loaded',
        settings: 'loaded',
        sync: 'loaded',
      },
    });

    renderDashboard();

    expect(screen.getByText(/Mazos sincronizados/)).toBeTruthy();
    expect(screen.getByText(/Ajustes sincronizados/)).toBeTruthy();
    expect(screen.getByText(/Sincronizado con la nube/)).toBeTruthy();
  });
});
