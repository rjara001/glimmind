import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GameCard } from '@/components/game/GameCard';

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
  onStartEdit: vi.fn(),
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

  it('calls onStartEdit when the edit button is clicked', () => {
    const onStartEdit = vi.fn();
    render(<GameCard {...defaultProps} revealed onStartEdit={onStartEdit} />);

    fireEvent.click(screen.getByLabelText('Edit card'));

    expect(onStartEdit).toHaveBeenCalledTimes(1);
  });

  it('does not show edit button when not revealed', () => {
    render(<GameCard {...defaultProps} revealed={false} />);

    expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
  });

  it('does not show edit button when associationId is missing', () => {
    render(<GameCard {...defaultProps} associationId={undefined} />);

    expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
  });

  it('does not show edit button when onStartEdit is missing', () => {
    render(<GameCard {...defaultProps} onStartEdit={undefined} />);

    expect(screen.queryByLabelText('Edit card')).not.toBeInTheDocument();
  });
});

describe('GameCard - voice flags', () => {
  it('renders flags inline with labels when voice is enabled', () => {
    render(
      <GameCard
        {...defaultProps}
        voiceEnabled={true}
        voiceTermLang="en"
        voiceDefLang="es"
      />
    );

    expect(screen.getByText(/🇬🇧/)).toBeInTheDocument();
    expect(screen.getByText(/🇪🇸/)).toBeInTheDocument();
  });

  it('does not render flags when voice is disabled', () => {
    render(
      <GameCard
        {...defaultProps}
        voiceEnabled={false}
        voiceTermLang="en"
        voiceDefLang="es"
      />
    );

    expect(screen.queryByText(/🇬🇧/)).not.toBeInTheDocument();
    expect(screen.queryByText(/🇪🇸/)).not.toBeInTheDocument();
  });

  it('renders globe for unknown languages', () => {
    render(
      <GameCard
        {...defaultProps}
        voiceEnabled={true}
        voiceTermLang="xx"
        voiceDefLang={undefined}
      />
    );

    const globes = screen.getAllByText(/🌐/);
    expect(globes.length).toBeGreaterThanOrEqual(1);
  });
});
