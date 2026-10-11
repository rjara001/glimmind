import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LandingValidationAnalysis } from '@/components/views/LandingValidationAnalysis';
import {
  LANDING_VALIDATION_EXPECTED,
  LANDING_VALIDATION_THRESHOLD_PERCENT,
  LANDING_VALIDATION_USER_INPUT,
} from '@/constants/landingValidationExample';

describe('LandingValidationAnalysis', () => {
  it('shows the real computed score from the alignment engine', () => {
    const { container } = render(<LandingValidationAnalysis />);

    expect(container.querySelector('.landing-analysis-score-pct')).toHaveTextContent('50%');
  });

  it('shows the expected sentence and the 80% threshold', () => {
    render(<LandingValidationAnalysis />);

    expect(screen.getByText(LANDING_VALIDATION_EXPECTED)).toBeInTheDocument();
    expect(screen.getAllByText(`${LANDING_VALIDATION_THRESHOLD_PERCENT}%`).length).toBeGreaterThan(0);
    expect(screen.getByText(/No alcanzaste/)).toBeInTheDocument();
  });

  it('lists one row per word of the user input', () => {
    const { container } = render(<LandingValidationAnalysis />);

    // 3 word rows, plus the expanded detail row for the first wrong word
    expect(container.querySelectorAll('.landing-analysis-row')).toHaveLength(3);
    expect(container.querySelectorAll('.landing-analysis-detail-row')).toHaveLength(1);
  });

  it('labels each word with its per-word status', () => {
    render(<LandingValidationAnalysis />);

    const badges = screen.getAllByRole('button', { name: /Ver detalle/ });
    // only the two wrong words are expandable
    expect(badges).toHaveLength(2);
    expect(screen.getAllByLabelText('Incorrecto')).toHaveLength(2);
    expect(screen.getAllByLabelText('Correcto')).toHaveLength(1);
  });

  it('reports the correct word count', () => {
    render(<LandingValidationAnalysis />);

    expect(screen.getByText('Palabras correctas')).toBeInTheDocument();
    expect(screen.getByText('1', { selector: '.landing-analysis-summary strong' })).toBeInTheDocument();
    expect(screen.getByText('/ 3')).toBeInTheDocument();
  });

  it('expands the first wrong word by default and shows its char diff', () => {
    render(<LandingValidationAnalysis />);

    expect(screen.getByRole('button', { name: 'Ver detalle de la palabra 1' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(screen.getByText(/Ver detalle abajo/)).toBeInTheDocument();
  });

  it('collapses and re-expands a row on click', () => {
    render(<LandingValidationAnalysis />);

    const toggle = screen.getByRole('button', { name: 'Ver detalle de la palabra 1' });
    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows the score breakdown cards', () => {
    render(<LandingValidationAnalysis />);

    expect(screen.getByText('Distancia')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('Caracteres')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Diferencias')).toBeInTheDocument();
    expect(screen.getByText('Umbral')).toBeInTheDocument();
  });

  it('renders one char cell per diff operation for both rows', () => {
    const { container } = render(<LandingValidationAnalysis />);

    const charRows = container.querySelectorAll('.landing-analysis-char-row');
    expect(charRows).toHaveLength(2);

    const userCells = charRows[0].querySelectorAll('.landing-analysis-char');
    const systemCells = charRows[1].querySelectorAll('.landing-analysis-char');
    // 4 ops for said/say: match:s match:a extra:i diff:d→y
    expect(userCells).toHaveLength(4);
    expect(systemCells).toHaveLength(4);
  });

  it('does not render a close button, it is a static landing section', () => {
    render(<LandingValidationAnalysis />);

    expect(screen.queryByRole('button', { name: 'Cerrar' })).not.toBeInTheDocument();
  });

  it('uses the same example the game engine would produce', () => {
    expect(LANDING_VALIDATION_USER_INPUT).toBe('said it htat');
    expect(LANDING_VALIDATION_EXPECTED).toBe('say it is');
  });
});