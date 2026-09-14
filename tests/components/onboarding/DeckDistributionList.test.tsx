import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DeckDistributionList } from '@/components/onboarding/DeckDistributionList';
import type { DeckDistributionItem } from '@/components/onboarding/DeckDistributionList';

const mockItems: DeckDistributionItem[] = [
  { name: 'Pepito', count: 100, max: 100 },
  { name: 'Pepito-2', count: 100, max: 100 },
  { name: 'Pepito-3', count: 30, max: 100 },
];

describe('DeckDistributionList', () => {
  it('renders deck names and counts', () => {
    render(<DeckDistributionList deckItems={mockItems} limit={100} />);

    expect(screen.getByText('Pepito')).toBeInTheDocument();
    expect(screen.getByText('Pepito-2')).toBeInTheDocument();
    expect(screen.getByText('Pepito-3')).toBeInTheDocument();

    const countSpans = screen.getAllByText('100');
    expect(countSpans.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('30')).toBeInTheDocument();
  });

  it('shows the limit indicator', () => {
    render(<DeckDistributionList deckItems={mockItems} limit={100} />);

    expect(screen.getByText(/Límite:/)).toBeInTheDocument();
    // The limit value has inline style color: #2563eb (blue)
    const limitSpans = screen.getAllByText('100');
    const limitIndicator = limitSpans.find(el => el.style.color === 'rgb(37, 99, 235)' || el.style.color === '#2563eb');
    expect(limitIndicator).toBeTruthy();
  });

  it('renders bars with correct fill percentages', () => {
    const { container } = render(<DeckDistributionList deckItems={mockItems} limit={100} />);

    const bars = container.querySelectorAll('[role="progressbar"]');
    expect(bars.length).toBe(3);

    expect(bars[0]).toHaveStyle({ width: '100%' });
    expect(bars[1]).toHaveStyle({ width: '100%' });
    expect(bars[2]).toHaveStyle({ width: '30%' });
  });

  it('renders nothing when deckItems is empty', () => {
    const { container } = render(<DeckDistributionList deckItems={[]} limit={100} />);

    expect(container.firstChild).toBeNull();
  });

  it('shows full indicator for decks at capacity', () => {
    render(<DeckDistributionList deckItems={mockItems} limit={100} />);

    const fullIndicators = screen.getAllByText('●');
    expect(fullIndicators.length).toBe(2);
  });

  it('applies different colors to each bar', () => {
    const { container } = render(<DeckDistributionList deckItems={mockItems} limit={100} />);

    const bars = container.querySelectorAll('[role="progressbar"]');
    // BAR_COLORS in component: ['#8b5cf6', '#6366f1', '#3b82f6', '#059669', '#d97706', '#64748b']
    expect(bars[0]).toHaveStyle({ backgroundColor: '#8b5cf6' });
    expect(bars[1]).toHaveStyle({ backgroundColor: '#6366f1' });
    expect(bars[2]).toHaveStyle({ backgroundColor: '#3b82f6' });
  });

  it('shows all items without scroll when <=10 decks', () => {
    const manyItems: DeckDistributionItem[] = Array.from({ length: 8 }, (_, i) => ({
      name: `Deck-${i + 1}`,
      count: 100,
      max: 100,
    }));
    render(<DeckDistributionList deckItems={manyItems} limit={100} />);

    // All 8 decks should be visible, no hidden count
    expect(screen.getByText('Deck-1')).toBeInTheDocument();
    expect(screen.getByText('Deck-8')).toBeInTheDocument();
    expect(screen.queryByText(/ decks más/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Ver todos/)).not.toBeInTheDocument();
  });

  it('shows hidden count and scroll when >10 decks', () => {
    const manyItems: DeckDistributionItem[] = Array.from({ length: 12 }, (_, i) => ({
      name: `Deck-${i + 1}`,
      count: 100,
      max: 100,
    }));
    render(<DeckDistributionList deckItems={manyItems} limit={100} />);

    expect(screen.getByText(/\+7 decks más/)).toBeInTheDocument();
    expect(screen.getByText(/Ver todos \(12\)/)).toBeInTheDocument();
  });

  it('expands to show all decks when toggle clicked', () => {
    const manyItems: DeckDistributionItem[] = Array.from({ length: 12 }, (_, i) => ({
      name: `Deck-${i + 1}`,
      count: 100,
      max: 100,
    }));
    render(<DeckDistributionList deckItems={manyItems} limit={100} />);

    expect(screen.getByText('Deck-1')).toBeInTheDocument();
    expect(screen.queryByText('Deck-12')).not.toBeInTheDocument();

    const toggle = screen.getByText(/Ver todos \(12\)/);
    fireEvent.click(toggle);

    expect(screen.getByText('Deck-12')).toBeInTheDocument();
    expect(screen.getByText(/Ocultar decks/)).toBeInTheDocument();
    expect(screen.queryByText(/\+\d+ deck/)).not.toBeInTheDocument();
  });

  it('has progressbar role with aria attributes', () => {
    const { container } = render(<DeckDistributionList deckItems={mockItems} limit={100} />);

    const bars = container.querySelectorAll('[role="progressbar"]');
    expect(bars.length).toBe(3);

    expect(bars[0]).toHaveAttribute('aria-label', 'Deck Pepito: 100 de 100 tarjetas');
    expect(bars[0]).toHaveAttribute('aria-valuenow', '100');
    expect(bars[0]).toHaveAttribute('aria-valuemin', '0');
    expect(bars[0]).toHaveAttribute('aria-valuemax', '100');
  });
});