import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReportsView } from './views/ReportsView';
import { useGameStore } from '../store/gameStore';
import { DEFAULT_SETTINGS } from '../types/settings';

describe('ReportsView', () => {
  const onBack = vi.fn();
  const onGoToSettings = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useGameStore.setState({
      settings: { ...DEFAULT_SETTINGS },
      sessions: [],
      sessionsLoading: false,
      lists: [],
      loadSessions: vi.fn(),
    });
  });

  it('renders the game summary tab by default', () => {
    render(<ReportsView onBack={onBack} onGoToSettings={onGoToSettings} />);
    expect(screen.getByText('Informes')).toBeInTheDocument();
    expect(screen.getByText('Resumen de juegos desactivado')).toBeInTheDocument();
  });

  it('switches to the ranking tab when clicked', () => {
    render(<ReportsView onBack={onBack} onGoToSettings={onGoToSettings} />);
    fireEvent.click(screen.getByText('Ranking'));
    expect(screen.getByText('Ranking desactivado')).toBeInTheDocument();
  });

  it('calls onBack when the back button is clicked', () => {
    render(<ReportsView onBack={onBack} onGoToSettings={onGoToSettings} />);
    fireEvent.click(screen.getByLabelText('Volver'));
    expect(onBack).toHaveBeenCalled();
  });
});
