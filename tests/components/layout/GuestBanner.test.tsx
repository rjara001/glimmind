import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GuestBanner } from '@/components/layout/GuestBanner';

const DISMISS_KEY = 'glimmind_guest_banner_dismissed';

describe('GuestBanner', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the ephemeral-data disclaimer in Spanish', () => {
    render(<GuestBanner onDismiss={vi.fn()} />);
    expect(
      screen.getByText(/Modo invitado: tus datos son temporales, solo en este navegador/),
    ).toBeDefined();
    expect(
      screen.getByText(/Al registrarte no se pasan a tu cuenta/),
    ).toBeDefined();
  });

  it('does not claim cross-device sync', () => {
    render(<GuestBanner onDismiss={vi.fn()} />);
    expect(screen.queryByText(/sync to the cloud/i)).toBeNull();
    expect(screen.queryByText(/sincroniza entre todos tus dispositivos/i)).toBeNull();
  });

  it('hides itself and persists the dismissal when the close button is clicked', () => {
    const onDismiss = vi.fn();
    render(<GuestBanner onDismiss={onDismiss} />);

    fireEvent.click(screen.getByLabelText('Cerrar aviso'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Modo invitado/)).toBeNull();
    expect(localStorage.getItem(DISMISS_KEY)).toBe('true');
  });

  it('renders nothing when previously dismissed', () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    render(<GuestBanner onDismiss={vi.fn()} />);
    expect(screen.queryByText(/Modo invitado/)).toBeNull();
  });
});
