import { describe, it, expect } from 'vitest';
import { evaluateAnswer } from './evaluateAnswer';

describe('evaluateAnswer', () => {
  it('accepts an exact match ignoring case and accents', async () => {
    const result = await evaluateAnswer('Casa', 'casa');
    expect(result).toEqual({ correct: true, method: 'exact', similarity: 1 });
  });

  it('ignores punctuation', async () => {
    const result = await evaluateAnswer('roof!', 'roof');
    expect(result.correct).toBe(true);
  });

  it('ignores articles when enabled', async () => {
    const result = await evaluateAnswer('the house', 'house', { ignoreArticles: true });
    expect(result.correct).toBe(true);
  });

  it('does not ignore articles when disabled', async () => {
    const result = await evaluateAnswer('the house', 'house', { ignoreArticles: false });
    expect(result.correct).toBe(false);
  });

  it('accepts fuzzy matches above the threshold', async () => {
    const result = await evaluateAnswer('hous', 'house', { threshold: 0.75 });
    expect(result.correct).toBe(true);
    expect(result.method).toBe('fuzzy');
  });

  it('rejects clearly different answers', async () => {
    const result = await evaluateAnswer('banana', 'roof');
    expect(result.correct).toBe(false);
    expect(result.method).toBe('fuzzy');
    expect(result.suggestion).toBeUndefined();
  });

  it('rejects empty input', async () => {
    const result = await evaluateAnswer('   ', 'roof');
    expect(result.correct).toBe(false);
  });

  it('marks ambiguous answers as incorrect with a pronunciation suggestion', async () => {
    const result = await evaluateAnswer('caza', 'casa', { threshold: 0.95 });
    expect(result.correct).toBe(false);
    expect(result.method).toBe('ambiguous');
    expect(result.suggestion).toBe('No te escuché bien. Probá pronunciar más claro o escribí la respuesta.');
  });
});
