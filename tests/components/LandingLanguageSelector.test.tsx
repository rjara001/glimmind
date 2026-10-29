import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../src/i18n';
import { LandingLanguageSelector } from '@/components/views/LandingLanguageSelector';

function renderLangSelector() {
  return render(
    <I18nextProvider i18n={i18n}>
      <LandingLanguageSelector />
    </I18nextProvider>
  );
}

describe('LandingLanguageSelector', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('es');
  });
  afterEach(() => cleanup());

  it('renders the language selector button', () => {
    renderLangSelector();
    const trigger = screen.getByRole('button', { name: /idioma/i });
    expect(trigger).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', () => {
    renderLangSelector();
    const trigger = screen.getByRole('button', { name: /idioma/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows all language options when dropdown is open', () => {
    renderLangSelector();
    const trigger = screen.getByRole('button', { name: /idioma/i });
    fireEvent.click(trigger);
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Português')).toBeInTheDocument();
    expect(screen.getByText('Français')).toBeInTheDocument();
    expect(screen.getByText('Deutsch')).toBeInTheDocument();
    expect(screen.getByText('中文')).toBeInTheDocument();
  });

  it('changes language when option is clicked', async () => {
    renderLangSelector();
    const trigger = screen.getByRole('button', { name: /idioma/i });
    fireEvent.click(trigger);
    const enOption = screen.getByText('English');
    fireEvent.click(enOption);
    expect(i18n.language).toBe('en');
  });

  it('closes dropdown when clicking outside', () => {
    renderLangSelector();
    const trigger = screen.getByRole('button', { name: /idioma/i });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseDown(document.body);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
