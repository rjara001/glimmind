import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsView } from './views/SettingsView';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_SETTINGS } from '../types/settings';
import { ToastProvider } from './layout/Toast';

describe('SettingsView', () => {
  const onBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({ settings: { ...DEFAULT_SETTINGS } });
  });

  const renderWithToast = (ui: React.ReactElement) => {
    return render(<ToastProvider>{ui}</ToastProvider>);
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
});
