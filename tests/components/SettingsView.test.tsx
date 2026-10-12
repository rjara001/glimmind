import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SettingsView } from '@/components/views/SettingsView';
import { useGameStore } from '@/store/gameStore';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { ToastProvider } from '@/components/layout/Toast';
import { GUEST_UID } from '@/constants/app';
import { PREMIUM_POLL_INTERVAL_MS, PREMIUM_POLL_TIMEOUT_MS } from '@/constants/premium';
import { stripeService } from '@/services/stripe';
import type { UserQuota } from '@/types/quota';

vi.mock('@/services/stripe', () => ({
  stripeService: {
    createCheckoutSession: vi.fn(),
  },
}));

const CHECKOUT_URL = 'https://checkout.stripe.com/test-session';

const FREE_QUOTA: UserQuota = {
  tier: 'free',
  cardCount: 120,
  cardQuota: 1000,
  aiQuotaDaily: 100,
  aiUsedToday: 5,
  ytAiUsedToday: 0,
  ytAiDailyLimit: 100,
  translationCharLimit: 5000,
  translationCharUsed: 100,
};

const PREMIUM_QUOTA: UserQuota = { ...FREE_QUOTA, tier: 'premium', cardQuota: 5000 };

const AUTHED_USER = {
  uid: 'user-1',
  displayName: 'Test User',
  email: 'test@example.com',
  photoURL: null,
};

describe('SettingsView', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({ settings: { ...DEFAULT_SETTINGS } });
    vi.mocked(stripeService.createCheckoutSession).mockResolvedValue(CHECKOUT_URL);
  });

  const renderWithToast = (ui: React.ReactElement, initialEntries: string[] = ['/settings']) => {
    return render(
      <MemoryRouter initialEntries={initialEntries}>
        <ToastProvider>{ui}</ToastProvider>
      </MemoryRouter>
    );
  };

  it('renders the history toggle off by default', () => {
    renderWithToast(<SettingsView onBack={onBack} />);
    const toggle = screen.getByRole('switch', { name: 'Registro de historial' });
    expect(toggle).toBeInTheDocument();
    expect(toggle.getAttribute('aria-checked')).toBe('false');
  });

  it('toggles the history setting and persists it in the store', () => {
    renderWithToast(<SettingsView onBack={onBack} />);
    const toggle = screen.getByRole('switch', { name: 'Registro de historial' });
    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(useGameStore.getState().settings.activityHistoryEnabled).toBe(true);
  });

  it('allows turning the history setting off again', () => {
    useGameStore.setState({ settings: { ...DEFAULT_SETTINGS, activityHistoryEnabled: true } });
    renderWithToast(<SettingsView onBack={onBack} />);
    const toggle = screen.getByRole('switch', { name: 'Registro de historial' });
    fireEvent.click(toggle);
    expect(useGameStore.getState().settings.activityHistoryEnabled).toBe(false);
  });

  describe('Premium section', () => {
    it('renders the heading and the upsell copy', () => {
      renderWithToast(<SettingsView onBack={onBack} />);
      expect(screen.getByText('Premium')).toBeInTheDocument();
      expect(screen.getByText(/desbloquear 5000 tarjetas/i)).toBeInTheDocument();
    });

    it('shows the upgrade CTA for a free user', () => {
      useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA });
      renderWithToast(<SettingsView onBack={onBack} />);
      expect(screen.getByRole('button', { name: 'Actualizar a Premium' })).toBeInTheDocument();
    });

    it('shows no purchase CTA for a premium user, since the plan is lifetime', () => {
      useGameStore.setState({ user: AUTHED_USER, quota: PREMIUM_QUOTA });
      renderWithToast(<SettingsView onBack={onBack} />);
      expect(screen.queryByRole('button', { name: 'Actualizar a Premium' })).not.toBeInTheDocument();
      expect(screen.getByText('Plan Premium')).toBeInTheDocument();
      expect(screen.getByText(/no se renueva ni cobra de nuevo/i)).toBeInTheDocument();
    });

    it('shows the quota status line once the quota has loaded', () => {
      useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA });
      renderWithToast(<SettingsView onBack={onBack} />);
      expect(screen.getByText(/Estado actual:/)).toHaveTextContent('120/1000');
    });

    it('still renders the other settings sections', () => {
      renderWithToast(<SettingsView onBack={onBack} />);
      expect(screen.getByText('Registro de historial')).toBeInTheDocument();
      expect(screen.getByText('Máximo de tarjetas por mazo')).toBeInTheDocument();
    });
  });

  describe('premium checkout', () => {
    it('opens a Stripe checkout session for a free user', async () => {
      useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA });
      renderWithToast(<SettingsView onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: 'Actualizar a Premium' }));

      expect(stripeService.createCheckoutSession).toHaveBeenCalledTimes(1);
      const [successUrl, cancelUrl] = vi.mocked(stripeService.createCheckoutSession).mock.calls[0];
      expect(successUrl).toBe(`${window.location.origin}/settings?upgrade=success`);
      expect(cancelUrl).toBe(`${window.location.origin}/settings?upgrade=canceled`);
    });

    it('never calls Stripe for a guest and shows the sign-in message', async () => {
      useGameStore.setState({ user: { ...AUTHED_USER, uid: GUEST_UID }, quota: FREE_QUOTA });
      renderWithToast(<SettingsView onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: 'Iniciá sesión para actualizar' }));

      expect(
        await screen.findByText(/Inicia sesión con Google para cambiar tu plan/i)
      ).toBeInTheDocument();
      expect(stripeService.createCheckoutSession).not.toHaveBeenCalled();
    });

    it('shows an error instead of navigating when checkout fails', async () => {
      vi.mocked(stripeService.createCheckoutSession).mockRejectedValue(new Error('boom'));
      useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA });
      renderWithToast(<SettingsView onBack={onBack} />);

      fireEvent.click(screen.getByRole('button', { name: 'Actualizar a Premium' }));

      expect(await screen.findByText(/No pudimos abrir el pago/i)).toBeInTheDocument();
    });
  });

  // Stripe redirects back before the webhook writes meta.tier, so the return trip
// must poll instead of trusting a single read. These tests pin that behaviour:
// claiming success before the tier flips is exactly the bug that made a working
// purchase look like a failure.
describe('checkout return handling', () => {
    const RenderAtSettings = () => (
      <Routes>
        <Route path="/settings" element={<SettingsView onBack={onBack} />} />
      </Routes>
    );

    const renderReturn = (param: string) =>
      render(
        <MemoryRouter initialEntries={[`/settings?${param}`]}>
          <ToastProvider>
            <RenderAtSettings />
          </ToastProvider>
        </MemoryRouter>
      );

    // The poll resolves outside React's event loop, so both the timer advance
    // and the store update it triggers have to be wrapped for the DOM to settle.
    const advance = async (ms: number) => {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(ms);
      });
    };

    it('keeps quiet until the webhook flips the tier, then confirms', async () => {
      vi.useFakeTimers();
      try {
        useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA });

        let calls = 0;
        const loadQuota = vi.fn(async () => {
          calls += 1;
          // The webhook lands on the second poll.
          if (calls >= 2) useGameStore.setState({ quota: PREMIUM_QUOTA });
        });
        useGameStore.setState({ loadQuota });

        renderReturn('upgrade=success');

        await advance(0);
        expect(screen.queryByText(/Tu cuenta ya es Premium/i)).not.toBeInTheDocument();

        await advance(PREMIUM_POLL_INTERVAL_MS);
        expect(screen.getByText(/Tu cuenta ya es Premium/i)).toBeInTheDocument();
        expect(loadQuota.mock.calls.length).toBeGreaterThanOrEqual(2);
      } finally {
        vi.useRealTimers();
      }
    });

    it('says it is pending instead of claiming success when the webhook never lands', async () => {
      vi.useFakeTimers();
      try {
        const loadQuota = vi.fn();
        useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA, loadQuota });

        renderReturn('upgrade=success');

        // Let the immediate first poll settle before checking anything.
        await advance(0);

        // attempts is 1 after the first poll, and the timeout trips once
        // attempts * interval reaches PREMIUM_POLL_TIMEOUT_MS, so 9 more ticks.
        await advance(PREMIUM_POLL_INTERVAL_MS * 9);

        expect(screen.getByText(/Estamos activando tu plan/i)).toBeInTheDocument();
        expect(screen.queryByText(/Tu cuenta ya es Premium/i)).not.toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops polling once the tier flips', async () => {
      vi.useFakeTimers();
      try {
        useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA });
        const loadQuota = vi.fn(async () => {
          useGameStore.setState({ quota: PREMIUM_QUOTA });
        });
        useGameStore.setState({ loadQuota });

        renderReturn('upgrade=success');

        // The first poll already flips the tier, so the toast lands right away.
        // Toasts auto-dismiss after 3s, so assert before advancing further.
        await advance(0);
        expect(screen.getByText(/Tu cuenta ya es Premium/i)).toBeInTheDocument();

        // Six more intervals go by and nothing is polled again.
        await advance(PREMIUM_POLL_INTERVAL_MS * 6);
        expect(loadQuota).toHaveBeenCalledTimes(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not claim success on ?upgrade=canceled', () => {
      const loadQuota = vi.fn();
      useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA, loadQuota });

      renderReturn('upgrade=canceled');

      expect(loadQuota).not.toHaveBeenCalled();
      expect(screen.getByText(/Cancelaste el pago/i)).toBeInTheDocument();
      expect(screen.queryByText(/Tu cuenta ya es Premium/i)).not.toBeInTheDocument();
    });

    it('stays quiet when there is no upgrade param', () => {
      const loadQuota = vi.fn();
      useGameStore.setState({ user: AUTHED_USER, quota: FREE_QUOTA, loadQuota });

      render(
        <MemoryRouter initialEntries={['/settings']}>
          <ToastProvider>
            <RenderAtSettings />
          </ToastProvider>
        </MemoryRouter>
      );

      expect(screen.queryByText(/Tu cuenta ya es Premium/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Cancelaste el pago/i)).not.toBeInTheDocument();
    });
  });
});