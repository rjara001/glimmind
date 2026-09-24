import { describe, it, expect } from 'vitest';
import { alignWords, diffChars, getHint, calculateSimilarity } from '@/utils/wordAlignment';

describe('wordAlignment', () => {
  describe('calculateSimilarity', () => {
    it('returns 1 for identical strings', () => {
      expect(calculateSimilarity('hello', 'hello')).toBe(1.0);
    });

    it('returns 0 for empty strings', () => {
      expect(calculateSimilarity('', 'hello')).toBe(0.0);
      expect(calculateSimilarity('hello', '')).toBe(0.0);
    });

    it('calculates similarity correctly for typos', () => {
      const sim = calculateSimilarity('mountain', 'montain');
      expect(sim).toBeGreaterThan(0.8);
      expect(sim).toBeLessThan(1.0);
    });
  });

  describe('alignWords', () => {
    it('aligns identical word arrays', () => {
      const result = alignWords('hello world', 'hello world');
      expect(result.words).toHaveLength(2);
      expect(result.words[0].userWord).toBe('hello');
      expect(result.words[0].systemWord).toBe('hello');
      expect(result.words[0].status).toBe('correct');
      expect(result.words[1].status).toBe('correct');
      expect(result.stats.correct).toBe(2);
      expect(result.stats.total).toBe(2);
    });

    it('aligns with one typo', () => {
      const result = alignWords('hello world', 'hello wrld');
      expect(result.words).toHaveLength(2);
      expect(result.words[0].status).toBe('correct');
      expect(result.words[1].status).toBe('similar');
      expect(result.stats.correct).toBe(1);
      expect(result.stats.similar).toBe(1);
    });

    it('aligns with missing word in user input (index-based)', () => {
      const result = alignWords('hello world', 'hello beautiful world');
      expect(result.words).toHaveLength(3);
      expect(result.words[0].status).toBe('correct'); // hello vs hello
      expect(result.words[1].userWord).toBe('world'); // world vs beautiful
      expect(result.words[1].systemWord).toBe('beautiful');
      expect(result.words[1].status).toBe('wrong');
      expect(result.words[2].userWord).toBe(''); // '' vs world
      expect(result.words[2].systemWord).toBe('world');
      expect(result.words[2].status).toBe('wrong');
    });

    it('aligns with extra word in user input (index-based)', () => {
      const result = alignWords('hello beautiful world', 'hello world');
      expect(result.words).toHaveLength(3);
      expect(result.words[0].status).toBe('correct'); // hello vs hello
      expect(result.words[1].userWord).toBe('beautiful'); // beautiful vs world
      expect(result.words[1].systemWord).toBe('world');
      expect(result.words[1].status).toBe('wrong');
      expect(result.words[2].userWord).toBe('world'); // world vs ''
      expect(result.words[2].systemWord).toBe('');
      expect(result.words[2].status).toBe('wrong');
    });

    it('handles completely different words', () => {
      const result = alignWords('completely different', 'totally other');
      expect(result.words).toHaveLength(2);
      expect(result.words[0].status).toBe('wrong');
      expect(result.words[1].status).toBe('wrong');
      expect(result.stats.wrong).toBe(2);
    });

    it('handles empty input', () => {
      const result = alignWords('', 'hello world');
      expect(result.words).toHaveLength(2);
      expect(result.words[0].userWord).toBe('');
      expect(result.words[0].status).toBe('wrong');
    });
  });

  describe('diffChars', () => {
    it('detects missing letter (montain vs mountain)', () => {
      const diffs = diffChars('montain', 'mountain');
      const missing = diffs.filter((d) => d.type === 'missing');
      expect(missing.length).toBe(1);
      expect(missing[0].char).toBe('u');
      expect(missing[0].index).toBe(2); // 0-based index in systemWord
    });

    it('detects extra letter (helloo vs hello)', () => {
      const diffs = diffChars('helloo', 'hello');
      const extra = diffs.filter((d) => d.type === 'extra');
      expect(extra.length).toBe(1);
      expect(extra[0].char).toBe('o');
      expect(extra[0].index).toBe(4); // 0-based index in userWord
    });

    it('detects substitution (casa vs caso)', () => {
      const diffs = diffChars('casa', 'caso');
      const diff = diffs.filter((d) => d.type === 'diff');
      expect(diff.length).toBe(1);
      expect(diff[0].userChar).toBe('a');
      expect(diff[0].systemChar).toBe('o');
      expect(diff[0].index).toBe(3); // 0-based index in userWord
    });

    it('detects multiple missing letters (motain vs mountain)', () => {
      const diffs = diffChars('motain', 'mountain');
      const missing = diffs.filter((d) => d.type === 'missing');
      expect(missing.length).toBe(2);
    });

    it('detects both missing and extra (montains vs mountain)', () => {
      const diffs = diffChars('montains', 'mountain');
      const missing = diffs.filter((d) => d.type === 'missing');
      const extra = diffs.filter((d) => d.type === 'extra');
      expect(missing.length).toBe(1); // missing 'u'
      expect(extra.length).toBe(1);   // extra 's'
    });

    it('returns empty for identical words', () => {
      const diffs = diffChars('hello', 'hello');
      expect(diffs.every((d) => d.type === 'match')).toBe(true);
    });

    it('reconstructs operations correctly via backtracking', () => {
      const diffs = diffChars('kitten', 'sitting');
      const types = diffs.map((d) => d.type);
      expect(types).toContain('diff');
      expect(types).toContain('missing');
    });
  });

  describe('getHint', () => {
    it('generates hint for single missing letter', () => {
      const diffs = diffChars('montain', 'mountain');
      const hint = getHint(diffs);
      expect(hint).toBe("Falta la letra 'u' en posición 3");
    });

    it('generates hint for single extra letter', () => {
      const diffs = diffChars('helloo', 'hello');
      const hint = getHint(diffs);
      expect(hint).toBe("Letra extra 'o' en posición 5");
    });

    it('generates hint for single substitution', () => {
      const diffs = diffChars('casa', 'caso');
      const hint = getHint(diffs);
      expect(hint).toBe("Letra 'a' → 'o' en posición 4");
    });

    it('generates hint for multiple missing letters', () => {
      const diffs = diffChars('motain', 'mountain');
      const hint = getHint(diffs);
      expect(hint).toContain("Faltan 2 letras");
      expect(hint).toContain("'u' en posición");
      expect(hint).toContain("'n' en posición");
    });

    it('generates hint for multiple extra letters', () => {
      const diffs = diffChars('hellooo', 'hello');
      const hint = getHint(diffs);
      expect(hint).toContain("Letras extra");
    });

    it('generates hint for multiple substitutions', () => {
      const diffs = diffChars('casa', 'ceso');
      const hint = getHint(diffs);
      expect(hint).toContain("sustituciones");
    });

    it('returns mixed type message for different diff types', () => {
      const diffs = [
        { type: 'missing' as const, char: 'a', index: 0 },
        { type: 'extra' as const, char: 'b', index: 1 },
      ];
      const hint = getHint(diffs);
      expect(hint).toBe('Múltiples diferencias. Ver detalle abajo.');
    });

    it('returns too many differences message for >3 mixed diffs', () => {
      const diffs = [
        { type: 'missing' as const, char: 'a', index: 0 },
        { type: 'extra' as const, char: 'b', index: 1 },
        { type: 'diff' as const, char: 'c→d', userChar: 'c', systemChar: 'd', index: 2 },
        { type: 'missing' as const, char: 'e', index: 3 },
      ];
      const hint = getHint(diffs);
      expect(hint).toBe('Demasiadas diferencias. Ver detalle abajo.');
    });

    it('aggregates same-type diffs even if >3', () => {
      const diffs = [
        { type: 'missing' as const, char: 'a', index: 0 },
        { type: 'missing' as const, char: 'b', index: 1 },
        { type: 'missing' as const, char: 'c', index: 2 },
        { type: 'missing' as const, char: 'd', index: 3 },
      ];
      const hint = getHint(diffs);
      expect(hint).toContain("Faltan 4 letras");
    });

    it('returns empty for no differences', () => {
      const hint = getHint([]);
      expect(hint).toBe('');
    });

    it('returns empty for all matches', () => {
      const diffs = diffChars('hello', 'hello');
      const hint = getHint(diffs);
      expect(hint).toBe('');
    });
  });
});