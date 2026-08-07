import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameCard } from './GameCard';

const defaultProps = {
  displayTerm: 'Word',
  displayDef: 'it pays',
  labelTerm: 'Term',
  labelDef: 'Definition',
  revealed: false,
  isPracticeMode: true,
  userInput: '',
  onUserInput: vi.fn(),
  feedback: 'none' as const,
  similarity: null,
  lastAttempt: '',
  currentCycle: 1,
  associationId: 'test-id',
  onEditCard: vi.fn(),
  onStartEdit: vi.fn(),
  onCancelEdit: vi.fn(),
};

describe('GameCard - hints', () => {
  it('shows the first letter hint for cycle 1', () => {
    render(<GameCard {...defaultProps} />);

    expect(screen.getByText('i* p***')).toBeInTheDocument();
  });

  it('hides the word shape when hints are disabled', () => {
    render(<GameCard {...defaultProps} showHints={false} />);

    expect(screen.queryByText('i* p***')).not.toBeInTheDocument();
    expect(screen.queryByText('it pays')).not.toBeInTheDocument();
  });

  it('shows the definition when revealed', () => {
    render(<GameCard {...defaultProps} revealed />);

    expect(screen.getByText('it pays')).toBeInTheDocument();
  });

  it('shows first letter hint below the input in real mode when hints are enabled', () => {
    render(<GameCard {...defaultProps} isPracticeMode={false} showHints={true} revealed={false} />);

    expect(screen.getByText('i* p***')).toBeInTheDocument();
  });

  it('hides first letter hint below the input in real mode when hints are disabled', () => {
    render(<GameCard {...defaultProps} isPracticeMode={false} showHints={false} revealed={false} />);

    expect(screen.queryByText('i* p***')).not.toBeInTheDocument();
  });

  it('shows first and last letter hint for cycle 2', () => {
    render(<GameCard {...defaultProps} currentCycle={2} />);

    expect(screen.getByText('it p**s')).toBeInTheDocument();
  });

  it('shows first and last letter hint for cycle 3', () => {
    render(<GameCard {...defaultProps} currentCycle={3} />);

    expect(screen.getByText('it p**s')).toBeInTheDocument();
  });

  it('shows first and last 2 letters hint for cycle 4', () => {
    render(<GameCard {...defaultProps} currentCycle={4} />);

    expect(screen.getByText('it p*ys')).toBeInTheDocument();
  });

  it('shows first letter hint below the input in real mode', () => {
    render(<GameCard {...defaultProps} isPracticeMode={false} showHints={true} currentCycle={1} revealed={false} />);

    expect(screen.getByText('i* p***')).toBeInTheDocument();
  });
});

describe('GameCard - editing', () => {
  it('shows an edit button when revealed', () => {
    render(<GameCard {...defaultProps} revealed />);

    expect(screen.getByLabelText('Edit card')).toBeInTheDocument();
  });

  it('enters edit mode when edit button is clicked', () => {
    const onStartEdit = vi.fn();
    const { rerender } = render(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} isEditing={false} />);

    fireEvent.click(screen.getByLabelText('Edit card'));
    expect(onStartEdit).toHaveBeenCalled();

    rerender(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} isEditing={true} />);
    expect(screen.getByDisplayValue('Word')).toBeInTheDocument();
    expect(screen.getByDisplayValue('it pays')).toBeInTheDocument();
    expect(screen.getByText('Guardar')).toBeInTheDocument();
    expect(screen.getByText('Cancelar')).toBeInTheDocument();
  });

  it('calls onEditCard and exits edit mode on Enter', () => {
    const onStartEdit = vi.fn();
    const onEditCard = vi.fn();
    const { rerender } = render(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onEditCard={onEditCard} isEditing={false} />);

    fireEvent.click(screen.getByLabelText('Edit card'));
    rerender(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onEditCard={onEditCard} isEditing={true} />);

    const termInput = screen.getByDisplayValue('Word');
    fireEvent.keyDown(termInput, { key: 'Enter' });

    expect(onEditCard).toHaveBeenCalledWith('Word', 'it pays');
  });

  it('restores original values and exits edit mode on Escape', () => {
    const onStartEdit = vi.fn();
    const onCancelEdit = vi.fn();
    const { rerender } = render(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onCancelEdit={onCancelEdit} isEditing={false} />);

    fireEvent.click(screen.getByLabelText('Edit card'));
    rerender(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onCancelEdit={onCancelEdit} isEditing={true} />);

    const termInput = screen.getByDisplayValue('Word');
    fireEvent.change(termInput, { target: { value: 'Changed' } });
    fireEvent.keyDown(termInput, { key: 'Escape' });

    rerender(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onCancelEdit={onCancelEdit} isEditing={false} />);
    expect(screen.getByText('Word')).toBeInTheDocument();
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it('calls onEditCard when Guardar button is clicked', () => {
    const onStartEdit = vi.fn();
    const onEditCard = vi.fn();
    const { rerender } = render(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onEditCard={onEditCard} isEditing={false} />);

    fireEvent.click(screen.getByLabelText('Edit card'));
    rerender(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onEditCard={onEditCard} isEditing={true} />);

    fireEvent.click(screen.getByText('Guardar'));

    expect(onEditCard).toHaveBeenCalledWith('Word', 'it pays');
  });

  it('calls onCancelEdit when Cancelar button is clicked', () => {
    const onStartEdit = vi.fn();
    const onCancelEdit = vi.fn();
    const { rerender } = render(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onCancelEdit={onCancelEdit} isEditing={false} />);

    fireEvent.click(screen.getByLabelText('Edit card'));
    rerender(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} onCancelEdit={onCancelEdit} isEditing={true} />);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(onCancelEdit).toHaveBeenCalled();
  });

  it('does not show edit button when not revealed', () => {
    render(<GameCard {...defaultProps} revealed={false} />);

    expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
  });

  it('does not show edit button when associationId is missing', () => {
    render(<GameCard {...defaultProps} associationId={undefined} />);

    expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
  });

  it('does not show edit button when onEditCard is missing', () => {
    render(<GameCard {...defaultProps} onEditCard={undefined} />);

    expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
  });
});
