import { describe, it, expect } from 'vitest';
import { shuffle } from '@/services/shuffleService';

describe('shuffleService', () => {
  it('returns a new array without mutating the original', () => {
    const original = [1, 2, 3, 4, 5];
    const result = shuffle(original);

    expect(result).not.toBe(original);
    expect(result).toHaveLength(original.length);
    expect(result.sort()).toEqual(original.sort());
  });

  it('returns empty array for empty input', () => {
    expect(shuffle([])).toEqual([]);
  });

  it('returns single element array unchanged', () => {
    expect(shuffle([42])).toEqual([42]);
  });

  it('preserves all elements', () => {
    const input = ['a', 'b', 'c', 'd', 'e'];
    const result = shuffle(input);
    expect(result.sort()).toEqual(input.sort());
  });

  it('produces uniformly distributed permutations (chi-squared test)', () => {
    // For 3 elements, there are 6 possible permutations.
    // With 6000 samples, each permutation should appear ~1000 times.
    const iterations = 6000;
    const permutations = new Map<string, number>();
    const elements = ['A', 'B', 'C'];

    for (let i = 0; i < iterations; i++) {
      const result = shuffle(elements);
      const key = result.join('');
      permutations.set(key, (permutations.get(key) ?? 0) + 1);
    }

    const expected = iterations / 6; // 6 permutations
    const chiSquared = Array.from(permutations.values()).reduce(
      (sum, count) => sum + Math.pow(count - expected, 2) / expected,
      0,
    );

    // Chi-squared critical value for 5 degrees of freedom at p=0.01 is 15.086
    // This means we reject the null hypothesis (uniform distribution) only if chi-squared > 15.086
    expect(chiSquared).toBeLessThan(15.086);
  });
});
