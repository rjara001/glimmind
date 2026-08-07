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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the answer validation section with the current threshold', () => {
    render(
      <SettingsModal
        list={createMockList({ settings: { mode: 'real', flipOrder: 'normal', threshold: 0.9 } })}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText('Answer Validation')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
    expect(screen.getByLabelText('Similarity threshold')).toHaveValue('90');
  });

  it('applies pending changes only when accepting', () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Toggle ignore articles'));
    fireEvent.change(screen.getByLabelText('Similarity threshold'), { target: { value: '80' } });

    expect(mockOnUpdateList).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Accept & Close'));

    expect(mockOnUpdateList).toHaveBeenCalledTimes(1);
    expect(mockOnUpdateList).toHaveBeenCalledWith(
      expect.objectContaining({ settings: expect.objectContaining({ ignoreArticles: true, threshold: 0.8 }) })
    );
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('closes without applying changes when cancelling', () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Toggle ignore articles'));
    fireEvent.click(screen.getByText('Cancel'));

    expect(mockOnUpdateList).not.toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('toggles hints off and applies the change when accepting', () => {
    render(
      <SettingsModal
        list={createMockList()}
        onUpdateList={mockOnUpdateList}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByLabelText('Toggle hints'));

    expect(mockOnUpdateList).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Accept & Close'));

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
});
