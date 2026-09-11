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
  onAddComplete: vi.fn(),
  onAddNewOnly: vi.fn(),
  onCustomize: vi.fn(),
  onBack: vi.fn(),
};

describe('DeckValidationScreen', () => {
  it('renders analysis tiles with correct counts', () => {
    render(<DeckValidationScreen {...defaultProps} />);

    expect(screen.getByText('65')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('40')).toBeInTheDocument();
  });

  it('renders the deck name and total badge in header', () => {
    render(<DeckValidationScreen {...defaultProps} />);

    expect(screen.getByText('"Latin Root"')).toBeInTheDocument();
    expect(screen.getByText('65 tarjetas')).toBeInTheDocument();
  });

  it('renders description with category breakdown', () => {
    render(<DeckValidationScreen {...defaultProps} />);

    expect(screen.getByText(/15 ya están en tu catálogo/)).toBeInTheDocument();
    expect(screen.getByText(/10 son similares/)).toBeInTheDocument();
    expect(screen.getByText(/40 son completamente nuevas/)).toBeInTheDocument();
  });

  it('shows special message when all cards are new', () => {
    const allNewResult = makeResult({ existing: 0, similar: 0, new: 65 });
    render(<DeckValidationScreen {...defaultProps} result={allNewResult} />);

    expect(screen.getByText(/¡Todas las tarjetas son nuevas para ti!/)).toBeInTheDocument();
  });

  it('calls onAddComplete when "Añadir mazo completo" is clicked', () => {
    const onAddComplete = vi.fn();
    render(<DeckValidationScreen {...defaultProps} onAddComplete={onAddComplete} />);

    fireEvent.click(screen.getByText(/Añadir mazo completo/));

    expect(onAddComplete).toHaveBeenCalledTimes(1);
  });

  it('calls onAddNewOnly when "Añadir solo tarjetas nuevas" is clicked', () => {
    const onAddNewOnly = vi.fn();
    render(<DeckValidationScreen {...defaultProps} onAddNewOnly={onAddNewOnly} />);

    fireEvent.click(screen.getByText(/Añadir solo tarjetas nuevas/));

    expect(onAddNewOnly).toHaveBeenCalledTimes(1);
  });

  it('calls onCustomize when "Personalizar selección" is clicked', () => {
    const onCustomize = vi.fn();
    render(<DeckValidationScreen {...defaultProps} onCustomize={onCustomize} />);

    fireEvent.click(screen.getByText(/Personalizar selección/));

    expect(onCustomize).toHaveBeenCalledTimes(1);
  });

  it('shows spinner text when isAdding is true', () => {
    render(<DeckValidationScreen {...defaultProps} isAdding={true} />);

    const addingButtons = screen.getAllByText('Agregando...');
    expect(addingButtons.length).toBeGreaterThanOrEqual(1);

    const buttons = screen.getAllByRole('button');
    const addButtons = buttons.filter((btn) => btn.hasAttribute('disabled'));
    expect(addButtons.length).toBeGreaterThan(0);
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

    const similarCheckbox = screen.getByRole('checkbox', { name: /Similares/i })
      .closest('label')
      ?.querySelector('input[type="checkbox"]') as HTMLInputElement;

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

  it('disables "Add only new" when new category is not selected', () => {
    const unselectedNew = { existing: true, similar: true, new: false } as Record<CardCategory, boolean>;
    render(<DeckValidationScreen {...defaultProps} selectedCategories={unselectedNew} />);

    fireEvent.click(screen.getByText(/Añadir solo tarjetas nuevas/));
    expect(defaultProps.onAddNewOnly).not.toHaveBeenCalled();
  });
});
