import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FEATURE_FLAGS, isFeatureEnabled } from '@/constants/featureFlags';
import { Navbar } from '@/components/Navbar';
import { AppHeader } from '@/components/layout/AppHeader';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'real-user-1',
      displayName: 'Real User',
      email: 'user@example.com',
      photoURL: null,
    },
    loading: false,
  }),
}));

describe('feature flag: reports', () => {
  describe('isFeatureEnabled', () => {
    it('reports is disabled', () => {
      expect(FEATURE_FLAGS.reports).toBe(false);
      expect(isFeatureEnabled('reports')).toBe(false);
    });
  });

  describe('Navbar (desktop nav)', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('does not render the Reports item while the flag is off', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Navbar onNavigate={vi.fn()} onLogout={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    });

    it('still renders the other nav items', () => {
      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Navbar onNavigate={vi.fn()} onLogout={vi.fn()} />
        </MemoryRouter>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('History')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });
  });

  describe('AppHeader (mobile nav)', () => {
    const headerProps = {
      view: 'dashboard',
      user: {
        uid: 'real-user-1',
        displayName: 'Real User',
        email: 'user@example.com',
        photoURL: null,
      },
      onShowQuickAdd: vi.fn(),
      onSync: vi.fn(),
      isSyncing: false,
      onNavigate: vi.fn(),
      onLogout: vi.fn(),
    };

    it('does not render the Reports button while the flag is off', () => {
      render(<AppHeader {...headerProps} />);

      expect(screen.queryByText('Reports')).not.toBeInTheDocument();
    });

    it('still renders the Activity button', () => {
      render(<AppHeader {...headerProps} />);

      expect(screen.getByText('Activity')).toBeInTheDocument();
    });
  });

  describe('code preservation', () => {
    it('ReportsView component still exists and renders when rendered directly', async () => {
      const { ReportsView } = await import('@/components/views/ReportsView');

      render(<ReportsView onBack={vi.fn()} onGoToSettings={vi.fn()} />);

      expect(screen.getByText('Informes')).toBeInTheDocument();
    });

    it('ranking utilities remain implemented and importable', async () => {
      const ranking = await import('@/utils/ranking');

      expect(typeof ranking.rankByPlays).toBe('function');
      expect(typeof ranking.rankByWeakness).toBe('function');
      expect(typeof ranking.summarizeSessions).toBe('function');
    });
  });
});