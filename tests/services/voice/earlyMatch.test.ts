import { describe, it, expect } from 'vitest';
import { isExactExpectedAnswer, normalizeForExactMatch } from '@/services/voice/stt/earlyMatch';

describe('normalizeForExactMatch', () => {
  it('lowercases text', () => {
    expect(normalizeForExactMatch('To Blend')).toBe('to blend');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeForExactMatch('  to blend  ')).toBe('to blend');
  });

  it('removes accents', () => {
    expect(normalizeForExactMatch('café')).toBe('cafe');
  });

  it('removes punctuation', () => {
    expect(normalizeForExactMatch('to blend!')).toBe('to blend');
  });

  it('normalizes multiple spaces to one', () => {
    expect(normalizeForExactMatch('to   blend')).toBe('to blend');
  });
});

describe('isExactExpectedAnswer', () => {
  it('accepts exact match', () => {
    expect(isExactExpectedAnswer('to blend', 'to blend')).toBe(true);
  });

  it('accepts exact match ignoring case', () => {
    expect(isExactExpectedAnswer('To Blend', 'to blend')).toBe(true);
  });

  it('accepts exact match with surrounding whitespace', () => {
    expect(isExactExpectedAnswer(' to blend ', 'to blend')).toBe(true);
  });

  it('accepts exact match with punctuation', () => {
    expect(isExactExpectedAnswer('to blend!', 'to blend')).toBe(true);
  });

  it('accepts exact match with accents', () => {
    expect(isExactExpectedAnswer('café', 'cafe')).toBe(true);
  });

  it('rejects partial match', () => {
    expect(isExactExpectedAnswer('to', 'to blend')).toBe(false);
  });

  it('rejects prefix match', () => {
    expect(isExactExpectedAnswer('catalog', 'cat')).toBe(false);
  });

  it('rejects phonetically similar but different text', () => {
    expect(isExactExpectedAnswer('bus', 'buzz')).toBe(false);
  });

  it('rejects empty input against non-empty expected', () => {
    expect(isExactExpectedAnswer('', 'to blend')).toBe(false);
  });
});
