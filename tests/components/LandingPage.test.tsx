import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LandingPage } from '@/components/views/LandingPage';
import { CYCLE_RULE_CHIPS } from '@/utils/cycle-rules';

function renderLanding() {
  return render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>
  );
}

// The first render of this file pays for the whole landing tree (demo, charts,
// landing.css), which can exceed the default 5s on a cold worker.
const RENDER_TIMEOUT_MS = 20000;

describe('LandingPage cycle section', () => {
  it('renders the shared cycle rule constant exactly once', () => {
    renderLanding();

    CYCLE_RULE_CHIPS.forEach((chip) => {
      expect(screen.getAllByText(chip)).toHaveLength(1);
    });
  }, RENDER_TIMEOUT_MS);

  it('does not repeat the retired rule framing', () => {
    const { container } = renderLanding();

    expect(container.textContent).not.toMatch(/Falla → siguiente nivel/);
    expect(container.textContent).not.toMatch(/Acierto → permanece/);
    expect(container.textContent).not.toMatch(/falla →/i);
    expect(screen.queryByText(/Fallaste/)).not.toBeInTheDocument();
  }, RENDER_TIMEOUT_MS);

  it('states where every word is and why', () => {
    renderLanding();

    expect(
      screen.getByText(/ves en qué ciclo está cada palabra y por qué está ahí/i),
    ).toBeInTheDocument();
  }, RENDER_TIMEOUT_MS);

  it('describes each stage by the cycles it has advanced', () => {
    renderLanding();

    expect(screen.getByText('Todavía no ha avanzado de ciclo.')).toBeInTheDocument();
    expect(screen.getByText('Avanzó una vez y sigue en camino.')).toBeInTheDocument();
    expect(screen.getByText('Avanzó dos veces. Ya debería sonarte.')).toBeInTheDocument();
    expect(screen.getByText('Avanzó tres veces: es el ciclo tope.')).toBeInTheDocument();
  }, RENDER_TIMEOUT_MS);
});
