import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsModal } from './SettingsModal';
import { AssociationList } from '../../types';

const createMockList = (overrides: Partial<AssociationList> = {}): AssociationList => ({
  id: 'list-1',
  userId: 'user-1',
  name: 'Test List',
  concept: 'Term / Definition',
  isArchived: false,
  settings: { mode: 'real', flipOrder: 'normal', threshold: 0.95, ignoreArticles: false },
  associations: [],
  ...overrides,
});

describe('SettingsModal - Answer Validation', () => {
  const mockOnUpdateList = vi.fn();
  const mockOnClose = vi.fn();
  const mockOnRestart = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the answer validation section with the current threshold', () => {
    render(
      <SettingsModal
        list={createMockList({ settings: { mode: 'real', flipOrder: 'normal', threshold: 0.9 } })}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
        onRestart={mockOnRestart}
      />
    );

    expect(screen.getByText('Answer Validation')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByLabelText('Similarity threshold')).toHaveValue('90');
  });

  it('toggles ignore articles through onUpdateList', () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
        onRestart={mockOnRestart}
      />
    );

    fireEvent.click(screen.getByLabelText('Toggle ignore articles'));

    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ ignoreArticles: true }) })
    );
  });

  it('updates the threshold through onUpdateList', () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
        onRestart={mockOnRestart}
      />
    );

    fireEvent.change(screen.getByLabelText('Similarity threshold'), { target: { value: '80' } });

    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ threshold: 0.8 }) })
    );
  });
});
