import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { SettingsModal } from '@/components/modals/SettingsModal';
import { AssociationList } from '@/types';

const createMockList = (overrides: Partial<AssociationList> = {}): AssociationList => ({
  id: 'list-1',
  userId: 'user-1',
  name: 'Test List',
  concept: 'Term / Definition',
  isArchived: false,
  settings: { mode: 'real', flipOrder: 'normal', threshold: 0.95, ignoreArticles: false, showHints: true, autoRevealAfterSeconds: 15, autoAdvanceAfterAttempts: 3, voiceEnabled: false, voiceTermLang: 'en', voiceDefLang: 'es', voiceCommands: { reveal: ['revelar'], pass: ['pasar'], continue: ['continuar'], stop: ['stop'] } },
  associations: [],
  ...overrides,
});

describe('SettingsModal - Answer Validation', () => {
  const mockOnUpdateList = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the answer validation section with the current threshold', () => {
    render(
      <SettingsModal
        list={createMockList({ settings: { mode: 'real', flipOrder: 'normal', threshold: 0.9, ignoreArticles: false, showHints: true, autoRevealAfterSeconds: 15, autoAdvanceAfterAttempts: 3, voiceEnabled: false, voiceTermLang: 'en', voiceDefLang: 'es', voiceCommands: { reveal: ['revelar'], pass: ['pasar'], continue: ['continuar'], stop: ['stop'] } } })}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Answer Validation')).toBeInTheDocument();
    // Component shows "90" not "90%"
    expect(screen.getByText('90')).toBeInTheDocument();
    // Input has aria-label "Similarity threshold"
    expect(screen.getByLabelText('Similarity threshold')).toHaveValue('90');
  });

  it('applies pending changes only when accepting', async () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    // Change threshold via slider
    const thresholdSlider = screen.getByLabelText('Similarity threshold') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(thresholdSlider, { target: { value: '80' } });
    });

    expect(mockOnUpdateList).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('Accept & Close'));
    });

    expect(mockOnUpdateList).toHaveBeenCalledTimes(1);
    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ threshold: 0.8 }) })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes without applying changes when cancelling', async () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    // Change threshold via slider
    const thresholdSlider = screen.getByLabelText('Similarity threshold') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(thresholdSlider, { target: { value: '80' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Cancel'));
    });

    expect(mockOnUpdateList).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('toggles hints off and applies the change when accepting', async () => {
    render(
      <SettingsModal
        list={createMockList({ settings: { mode: 'real', flipOrder: 'normal', threshold: 0.95, ignoreArticles: false, showHints: true, autoRevealAfterSeconds: 15, autoAdvanceAfterAttempts: 3, voiceEnabled: false, voiceTermLang: 'en', voiceDefLang: 'es', voiceCommands: { reveal: ['revelar'], pass: ['pasar'], continue: ['continuar'], stop: ['stop'] } } })}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    // Find hints toggle button - click the toggle switch
    const hintsButton = screen.getByText('Hints').closest('button');
    if (hintsButton) {
      await act(async () => fireEvent.click(hintsButton));
    }

    expect(mockOnUpdateList).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('Accept & Close'));
    });

    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ showHints: false }) })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('does not render the restart option', () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText('Restart List')).not.toBeInTheDocument();
  });

  it('shows language selectors only when voice is enabled', async () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByLabelText('Idioma de Term')).not.toBeInTheDocument();

    const voiceToggle = screen.getByLabelText('Toggle voice');
    await act(async () => fireEvent.click(voiceToggle));

    expect(screen.getByLabelText('Idioma de Term')).toBeInTheDocument();
    expect(screen.getByLabelText('Idioma de Definition')).toBeInTheDocument();
  });

  it('applies voice language settings when accepting', async () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    const voiceToggle = screen.getByLabelText('Toggle voice');
    await act(async () => fireEvent.click(voiceToggle));

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Idioma de Term'), { target: { value: 'en' } });
      fireEvent.change(screen.getByLabelText('Idioma de Definition'), { target: { value: 'es' } });
    });

    expect(mockOnUpdateList).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByText('Accept & Close'));
    });

    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({ voiceEnabled: true, voiceTermLang: 'en', voiceDefLang: 'es' }),
      })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

describe('SettingsModal - Voice Commands', () => {
  const mockOnUpdateList = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows command inputs', async () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    // Voice command inputs are always visible
    expect(screen.getByLabelText('Voice command reveal')).toHaveValue('revelar');
    expect(screen.getByLabelText('Voice command pass')).toBeInTheDocument();
    expect(screen.getByLabelText('Voice command continue')).toBeInTheDocument();
    expect(screen.getByLabelText('Voice command stop')).toBeInTheDocument();
  });

  it('applies edited command keywords when accepting', async () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    const voiceToggle = screen.getByLabelText('Toggle voice');
    await act(async () => fireEvent.click(voiceToggle));

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Voice command reveal'), { target: { value: 'mostrar' } });
      fireEvent.change(screen.getByLabelText('Voice command stop'), { target: { value: 'alto, detente' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Accept & Close'));
    });

    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          voiceCommands: expect.objectContaining({
            reveal: ['mostrar'],
            stop: ['alto', 'detente'],
          }),
        }),
      })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('clears commands to empty arrays when inputs are emptied', async () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    const voiceToggle = screen.getByLabelText('Toggle voice');
    await act(async () => fireEvent.click(voiceToggle));

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Voice command pass'), { target: { value: '' } });
    });

    await act(async () => {
      fireEvent.click(screen.getByText('Accept & Close'));
    });

    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({
        settings: expect.objectContaining({
          voiceCommands: expect.objectContaining({ pass: [] }),
        }),
      })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});