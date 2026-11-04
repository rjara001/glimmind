
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LandingPage } from '@/components/views/LandingPage';
import { BrowserRouter } from 'react-router-dom';
import i18n from '@/i18n';

describe('LandingPage Cycle Rule Chips', () => {
  beforeEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
  });

  it('renders Spanish cycle rules by default', () => {
    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('⬇ Correcto en ciclo 1 → APRENDIDAS')).toBeInTheDocument();
    expect(screen.getByText('✅ Correcto en ciclo 2 o más → se queda')).toBeInTheDocument();
    expect(screen.getByText('➡ Siguiente → pasa de ciclo')).toBeInTheDocument();
  });

  it('renders English cycle rules when language changes to en', async () => {
    await act(async () => {
      await i18n.changeLanguage('en');
    });

    render(
      <BrowserRouter>
        <LandingPage />
      </BrowserRouter>
    );

    expect(screen.getByText('⬇ Correct in cycle 1 → LEARNED')).toBeInTheDocument();
    expect(screen.getByText('✅ Correct in cycle 2 or more → stays')).toBeInTheDocument();
    expect(screen.getByText('➡ Next → advances cycle')).toBeInTheDocument();
  });
});
