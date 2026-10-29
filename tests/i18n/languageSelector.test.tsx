import React from 'react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { LanguageSelector } from '../../src/components/layout/LanguageSelector';
import i18n from '../../src/i18n';

describe('LanguageSelector & Language Switching', () => {
  beforeEach(async () => {
    localStorage.clear();
    await act(async () => {
      await i18n.changeLanguage('es');
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18n.changeLanguage('es');
    });
  });

  it('renders compact LanguageSelector and opens dropdown', () => {
    render(<LanguageSelector variant="compact" />);

    const trigger = screen.getByRole('button', { name: /idioma/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('ES')).toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('English')).toBeInTheDocument();
    expect(screen.getByText('Español')).toBeInTheDocument();
  });

  it('changes language to English when selected from compact selector', async () => {
    render(<LanguageSelector variant="compact" />);

    const trigger = screen.getByRole('button', { name: /idioma/i });
    fireEvent.click(trigger);

    const enOption = screen.getByText('English');
    await act(async () => {
      fireEvent.click(enOption);
    });

    expect(i18n.language).toBe('en');
    expect(localStorage.getItem('glimmind_lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('renders full variant LanguageSelector in Settings style and switches language', async () => {
    render(<LanguageSelector variant="full" />);

    const esButton = screen.getByRole('button', { name: /Español/i });
    const enButton = screen.getByRole('button', { name: /English/i });

    expect(esButton).toHaveAttribute('aria-pressed', 'true');
    expect(enButton).toHaveAttribute('aria-pressed', 'false');

    await act(async () => {
      fireEvent.click(enButton);
    });

    expect(i18n.language).toBe('en');
    expect(enButton).toHaveAttribute('aria-pressed', 'true');
    expect(esButton).toHaveAttribute('aria-pressed', 'false');
    expect(localStorage.getItem('glimmind_lang')).toBe('en');
    expect(document.documentElement.lang).toBe('en');
  });
});
