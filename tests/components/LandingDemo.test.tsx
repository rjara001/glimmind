import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingDemo } from '@/components/views/LandingDemo';
import { LANDING_DEMO_DECK } from '@/constants/landingDemoDeck';
import { getAutoHintMode, maskHint } from '@/utils/maskHint';

const getInput = () => screen.getByLabelText('Escribe tu respuesta') as HTMLInputElement;
const getNextButton = () => screen.getByRole('button', { name: /siguiente/i });
const getRevealButton = () => screen.getByRole('button', { name: /revelar/i });
const validate = (answer: string) => {
  fireEvent.change(getInput(), { target: { value: answer } });
  fireEvent.click(screen.getByRole('button', { name: 'VALIDAR' }));
};

const advanceTo = (index: number) => {
  for (let i = 0; i < index; i++) {
    fireEvent.click(getRevealButton());
    fireEvent.click(getNextButton());
  }
};

describe('LandingDemo', () => {
  it('renders the first card of the deck', () => {
    render(<LandingDemo />);

    expect(screen.getByText(LANDING_DEMO_DECK[0].term)).toBeInTheDocument();
    expect(screen.getByText('1/12')).toBeInTheDocument();
  });

  it('masks the definition using the cycle hint mode', () => {
    render(<LandingDemo />);

    const first = LANDING_DEMO_DECK[0];
    const expectedHint = maskHint(first.definition, getAutoHintMode(first.cycle));

    expect(screen.getByText(expectedHint)).toBeInTheDocument();
    expect(screen.queryByText(first.definition)).not.toBeInTheDocument();
  });

  it('shows the cycle stage label for the card', () => {
    render(<LandingDemo />);

    expect(screen.getByText('NUEVA')).toBeInTheDocument();
  });

  it('keeps Siguiente disabled until the user validates or reveals', () => {
    render(<LandingDemo />);

    expect(getNextButton()).toBeDisabled();

    fireEvent.click(getRevealButton());

    expect(getNextButton()).toBeEnabled();
  });

  it('marks an exact answer as correct with 100% similarity', () => {
    render(<LandingDemo />);

    validate(LANDING_DEMO_DECK[0].definition);

    expect(screen.getByText('✓ Correcto')).toBeInTheDocument();
    expect(screen.getByText('Similitud: 100%')).toBeInTheDocument();
  });

  it('marks a fuzzy answer as correct thanks to the 80% threshold', () => {
    render(<LandingDemo />);

    // "It's a deal" expects "trato hecho"; "trato echo" scores 91% and still counts
    advanceTo(5);
    validate('trato echo');

    expect(screen.getByText('✓ Correcto')).toBeInTheDocument();
    expect(screen.getByText('Similitud: 91%')).toBeInTheDocument();
  });

  it('marks an unrelated answer as incorrect and shows its similarity', () => {
    render(<LandingDemo />);

    validate('zzzzz');

    expect(screen.getByText('✗ Incorrecto')).toBeInTheDocument();
    expect(screen.getByText('Similitud: 0%')).toBeInTheDocument();
  });

  it('records the user answer as a struck-through attempt', () => {
    render(<LandingDemo />);

    validate('zzzzz');

    expect(screen.getByText('zzzzz')).toBeInTheDocument();
  });

  it('ignores validation when the input is empty', () => {
    render(<LandingDemo />);

    fireEvent.click(screen.getByRole('button', { name: 'VALIDAR' }));

    expect(screen.queryByText('✓ Correcto')).not.toBeInTheDocument();
    expect(screen.queryByText('✗ Incorrecto')).not.toBeInTheDocument();
    expect(getNextButton()).toBeDisabled();
  });

  it('updates the correct counter after a right answer', () => {
    render(<LandingDemo />);

    validate(LANDING_DEMO_DECK[0].definition);

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('advances to the next card and resets the input', () => {
    render(<LandingDemo />);

    validate(LANDING_DEMO_DECK[0].definition);
    fireEvent.click(getNextButton());

    expect(screen.getByText(LANDING_DEMO_DECK[1].term)).toBeInTheDocument();
    expect(screen.getByText('2/12')).toBeInTheDocument();
    expect(getInput().value).toBe('');
    expect(screen.queryByText('✓ Correcto')).not.toBeInTheDocument();
  });

  it('loops back to the first card after the last one', () => {
    render(<LandingDemo />);

    advanceTo(LANDING_DEMO_DECK.length - 1);

    expect(screen.getByText('12/12')).toBeInTheDocument();
    expect(screen.getByText('FRECUENTE')).toBeInTheDocument();

    fireEvent.click(getRevealButton());
    fireEvent.click(getNextButton());

    expect(screen.getByText(LANDING_DEMO_DECK[0].term)).toBeInTheDocument();
    expect(screen.getByText('1/12')).toBeInTheDocument();
  });

  it('reveals the definition without scoring the attempt', () => {
    render(<LandingDemo />);

    fireEvent.click(getRevealButton());

    expect(screen.getByText(LANDING_DEMO_DECK[0].definition)).toBeInTheDocument();
    expect(screen.queryByText('✗ Incorrecto')).not.toBeInTheDocument();
    expect(getRevealButton()).toBeDisabled();
  });

  it('validates on Enter key press', () => {
    render(<LandingDemo />);

    fireEvent.change(getInput(), { target: { value: LANDING_DEMO_DECK[0].definition } });
    fireEvent.submit(getInput().closest('form') as HTMLFormElement);

    expect(screen.getByText('✓ Correcto')).toBeInTheDocument();
  });
});