
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameHeader } from './GameHeader';

const mockOnBack = vi.fn();
const mockOnSettingsClick = vi.fn();

describe('GameHeader component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders list name, progress, and other info correctly', () => {
    render(
      <GameHeader
        listName="Verbos Compuestos"
        currentIndex={0}
        queueLength={52}
        cycle4Count={0}
        gameMode="real"
        onBack={mockOnBack}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    expect(screen.getByText('Verbos Compuestos')).toBeInTheDocument();
  });

  test('renders the settings button and calls onSettingsClick when clicked', () => {
    render(
      <GameHeader
        listName="Test"
        currentIndex={0}
        queueLength={10}
        cycle4Count={0}
        gameMode="real"
        onBack={mockOnBack}
        onSettingsClick={mockOnSettingsClick}
      />
    );

    const buttons = screen.getAllByRole('button');
    const settingsButton = buttons[1];

    expect(settingsButton).toBeInTheDocument();

    fireEvent.click(settingsButton);

    expect(mockOnSettingsClick).toHaveBeenCalledTimes(1);
  });

  test('calls onBack when the back button is clicked', () => {
    render(
        <GameHeader
            listName="Test"
            currentIndex={0}
            queueLength={10}
            cycle4Count={0}
            gameMode="real"
            onBack={mockOnBack}
            onSettingsClick={mockOnSettingsClick}
        />
    );

    const backButton = screen.getAllByRole('button')[0];
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
  });
});
