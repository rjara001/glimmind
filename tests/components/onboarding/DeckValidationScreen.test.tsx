import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeckValidationScreen } from '@/components/onboarding/DeckValidationScreen';
import type { PrebuiltDeck } from '@/types/prebuilt-deck';
import type { DeckValidationResult, CardCategory } from '@/types/deck-validation';

const mockDeck: PrebuiltDeck = {
  id: 'deck-1',
  name: 'Latin Root',
  concept: 'value1 / value2',
  description: 'Learn Latin roots',
  icon: '📚',
  category: 'Casual',
  order: 1,
  active: true,
  associations: Array(65).fill({ term: 'word', definition: 'def' }),
};

const makeResult = (overrides: Partial<{
  total: number;
  existing: number;
  similar: number;
  new: number;
  similarMatch: boolean;
}> = {}): DeckValidationResult => {
  const total = overrides.total ?? 65;
  const counts = {
    existing: overrides.existing ?? 15,
    similar: overrides.similar ?? 10,
    new: overrides.new ?? 40,
  };
  const categorized: DeckValidationResult['categorized'] = [];

  for (let i = 0; i < counts.existing; i++) {
    categorized.push({ card: { term: `existing-${i}`, definition: 'def' }, category: 'existing' });
  }
  for (let i = 0; i < counts.similar; i++) {
    const entry: { card: { term: string; definition: string }; category: CardCategory; similarMatch?: { existingTerm: string; similarity: number } } = {
      card: { term: `similar-${i}`, definition: 'def' },
      category: 'similar',
    };
    if (overrides.similarMatch !== false) {
      entry.similarMatch = { existingTerm: `existing-${i}`, similarity: 0.85 };
    }
    categorized.push(entry);
  }
  for (let i = 0; i < counts.new; i++) {
    categorized.push({ card: { term: `new-${i}`, definition: 'def' }, category: 'new' });
  }

  return { total, counts, categorized };
};

const defaultProps = {
  deck: mockDeck,
  result: makeResult(),
  selectedCategories: { existing: true, similar: true, new: true } as Record<CardCategory, boolean>,
  isAdding: false,
  onToggleCategory: vi.fn(),
  onAddSelected: vi.fn(),
  onBack: vi.fn(),
};

describe('DeckValidationScreen', () => {
  it('renders analysis tiles with correct counts', () => {
    render(<DeckValidationScreen {...defaultProps} />);

    // Total appears in header badge and in stats - check both exist
    expect(screen.getAllByText('65')).toHaveLength(2);
    // The counts 15, 10, 40 appear in stats tiles and in description
    expect(screen.getAllByText('15')).toHaveLength(2);
    expect(screen.getAllByText('10')).toHaveLength(2);
    expect(screen.getAllByText('40')).toHaveLength(2);
  });

  it('renders the deck name and total badge in header', () => {
    render(<DeckValidationScreen {...defaultProps} />);

    expect(screen.getByText('"Latin Root"')).toBeInTheDocument();
    expect(screen.getByText('65 tarjetas')).toBeInTheDocument();
  });

  it('renders description with category breakdown', () => {
    const { container } = render(<DeckValidationScreen {...defaultProps} />);

    // Text is broken up by <strong> tags, check container textContent
    expect(container.textContent).toContain('existentes');
    expect(container.textContent).toContain('similares');
    expect(container.textContent).toContain('nuevas');
  });

  it('shows special message when all cards are new', () => {
    const allNewResult = makeResult({ existing: 0, similar: 0, new: 65 });
    render(<DeckValidationScreen {...defaultProps} result={allNewResult} />);

    expect(screen.getByText(/¡Todas las tarjetas son nuevas para ti!/)).toBeInTheDocument();
  });

  it('calls onAddSelected when "Agregar tarjetas" is clicked', () => {
    const onAddSelected = vi.fn();
    render(<DeckValidationScreen {...defaultProps} onAddSelected={onAddSelected} />);

    fireEvent.click(screen.getByText(/Agregar tarjetas/));

    expect(onAddSelected).toHaveBeenCalledTimes(1);
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<DeckValidationScreen {...defaultProps} onBack={onBack} />);

    fireEvent.click(screen.getByText(/Volver al Catálogo/));

    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleCategory when a checkbox is toggled', () => {
    const onToggleCategory = vi.fn();
    render(<DeckValidationScreen {...defaultProps} onToggleCategory={onToggleCategory} />);

    const similarCheckbox = screen.getByRole('checkbox', { name: /Similares/i }) as HTMLInputElement;
    fireEvent.click(similarCheckbox);

    expect(onToggleCategory).toHaveBeenCalledWith('similar');
  });

  it('shows example pairs when similar expander is clicked', () => {
    render(<DeckValidationScreen {...defaultProps} />);

    const expanderButton = screen.getByText('Ver ejemplos');
    fireEvent.click(expanderButton);

    const examples = screen.getAllByText(/\(85% similar\)/);
    expect(examples.length).toBeGreaterThan(0);
  });

  it('does not disable button based on isAdding prop (only selectedCount matters)', () => {
    render(<DeckValidationScreen {...defaultProps} isAdding={true} />);

    const addButton = screen.getByRole('button', { name: /Agregar tarjetas/ });
    // isAdding prop doesn't disable the button - only selectedCount === 0 does
    expect(addButton).not.toBeDisabled();
  });

  it('disables "Agregar tarjetas" when no categories selected', () => {
    const unselectedAll = { existing: false, similar: false, new: false } as Record<CardCategory, boolean>;
    render(<DeckValidationScreen {...defaultProps} selectedCategories={unselectedAll} />);

    const addButton = screen.getByRole('button', { name: /Agregar tarjetas/ });
    expect(addButton).toBeDisabled();
  });
});