import { describe, it, expect } from 'vitest';
import { normalizeText } from './text';

describe('normalizeText', () => {
  it('lowercases text', () => {
    expect(normalizeText('Hello World')).toBe('hello world');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('removes accents', () => {
    expect(normalizeText('MÁS rápido Á É Í')).toBe('mas rapido a e i');
  });

  it('combines all normalizations', () => {
    expect(normalizeText('  Café Frío  ')).toBe('cafe frio');
  });
});
