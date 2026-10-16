import { describe, it, expect } from 'vitest';
import {
  calculateSimilarity,
  findBestSimilarity,
  levenshteinDistance,
  levenshteinDistanceCapped,
  lengthBandExcludes,
  normalize,
  similarityOfNormalized,
} from '@/utils/similarity';

// Reference implementation: the original full-matrix Levenshtein and the
// original calculateSimilarity built on top of it. Used as the oracle for
// equivalence with the optimized two-row / pruned versions.
const referenceLevenshtein = (a: string, b: string): number => {
  const matrix = Array.from({ length: a.length + 1 }, () =>
    Array.from({ length: b.length + 1 }, (_, i) => i),
  );
  for (let i = 1; i <= a.length; i++) {
    matrix[i][0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost,
      );
    }
  }
  return matrix[a.length][b.length];
};

const referenceSimilarity = (str1: string, str2: string): number => {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  const editDistance = referenceLevenshtein(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);
  return (maxLength - editDistance) / maxLength;
};

const naiveBestSimilarity = (
  targetNorm: string,
  candidates: string[],
): { similarity: number; term: string } => {
  let bestSimilarity = 0;
  let bestTerm = '';
  for (const candidate of candidates) {
    const sim = similarityOfNormalized(targetNorm, candidate);
    if (sim > bestSimilarity) {
      bestSimilarity = sim;
      bestTerm = candidate;
    }
  }
  return { similarity: bestSimilarity, term: bestTerm };
};

// Deterministic pseudo-random generator so the equivalence sweep is stable.
const createRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};

const randomTerm = (random: () => number, minLength = 4, maxLength = 14): string => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const length = minLength + Math.floor(random() * (maxLength - minLength + 1));
  return Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join('');
};

const PAIR_FIXTURES: [string, string][] = [
  ['test', 'tests'],
  ['tests', 'test'],
  ['abandon', 'abandonar'],
  ['house', 'house'],
  ['cat', 'dog'],
  ['cafe', 'café'],
  ['hola', 'hola!'],
  ['a', 'ab'],
  ['abc', 'abcdefgh'],
  ['same-length-diff', 'same-length-difF'],
  ['x', ''],
  ['', ''],
  ['word', 'word '],
  ['interstellar', 'interstellarly'],
  ['red', 'red'],
];

describe('levenshteinDistance', () => {
  it('matches the full-matrix reference implementation', () => {
    const fixtures: [string, string][] = [
      ...PAIR_FIXTURES,
      ['kitten', 'sitting'],
      ['saturday', 'sunday'],
      ['ñandú', 'nandu'],
      ['', 'abc'],
      ['abc', ''],
      ['a', 'a'],
      ['longer-string-with-many-chars', 'longer-string-with-many-chart'],
    ];
    for (const [a, b] of fixtures) {
      expect(levenshteinDistance(a, b)).toBe(referenceLevenshtein(a, b));
    }
  });
});

describe('calculateSimilarity', () => {
  it('matches the original full-matrix implementation on raw inputs', () => {
    const fixtures: [string, string][] = [
      ...PAIR_FIXTURES,
      ['a--b', 'a b'],
      ['  spaced  word', 'spaced word'],
      ['Machine Learning', 'machine-learning'],
      ['café con leche', 'cafe con leche'],
    ];
    for (const [a, b] of fixtures) {
      expect(calculateSimilarity(a, b)).toBe(referenceSimilarity(a, b));
    }
  });

  it('computes the known boundary pair at exactly 0.8', () => {
    expect(calculateSimilarity('test', 'tests')).toBe(0.8);
    expect(calculateSimilarity('tests', 'test')).toBe(0.8);
  });
});

describe('similarityOfNormalized', () => {
  it('agrees with calculateSimilarity on already-normalized inputs', () => {
    for (const [a, b] of PAIR_FIXTURES) {
      const normalizedA = normalize(a);
      const normalizedB = normalize(b);
      expect(similarityOfNormalized(normalizedA, normalizedB)).toBe(
        calculateSimilarity(a, b),
      );
    }
  });
});

describe('levenshteinDistanceCapped', () => {
  it('returns the exact distance when it is within the cap', () => {
    expect(levenshteinDistanceCapped('test', 'tests', 1)).toBe(1);
    expect(levenshteinDistanceCapped('kitten', 'sitting', 3)).toBe(3);
    expect(levenshteinDistanceCapped('abc', 'abc', 0)).toBe(0);
    expect(levenshteinDistanceCapped('', 'abc', 3)).toBe(3);
  });

  it('returns cap + 1 when the distance exceeds the cap', () => {
    expect(levenshteinDistanceCapped('cat', 'elephant', 1)).toBe(2);
    expect(levenshteinDistanceCapped('kitten', 'sitting', 2)).toBe(3);
    expect(levenshteinDistanceCapped('', 'abcdef', 2)).toBe(3);
  });

  it('agrees with the full distance whenever the full distance is within the cap', () => {
    const random = createRandom(99);
    for (let i = 0; i < 200; i++) {
      const a = randomTerm(random);
      const b = randomTerm(random);
      const full = referenceLevenshtein(a, b);
      expect(levenshteinDistanceCapped(a, b, full)).toBe(full);
    }
  });
});

describe('lengthBandExcludes', () => {
  it('never excludes pairs whose similarity can still reach the threshold', () => {
    const threshold = 0.8;
    for (const [a, b] of PAIR_FIXTURES) {
      const normalizedA = normalize(a);
      const normalizedB = normalize(b);
      if (lengthBandExcludes(normalizedA, normalizedB, threshold)) {
        expect(calculateSimilarity(a, b)).toBeLessThan(threshold);
      }
    }
  });

  it('keeps the exact-threshold boundary pair (test/tests at 0.8)', () => {
    expect(lengthBandExcludes('test', 'tests', 0.8)).toBe(false);
    expect(lengthBandExcludes('tests', 'test', 0.8)).toBe(false);
  });

  it('excludes pairs that are too far apart in length', () => {
    expect(lengthBandExcludes('cat', 'elephant', 0.8)).toBe(true);
    expect(lengthBandExcludes('ab', 'abcdefgh', 0.8)).toBe(true);
  });

  it('is sound on a randomized sweep of term pairs', () => {
    const random = createRandom(7);
    const threshold = 0.8;
    for (let i = 0; i < 300; i++) {
      const a = normalize(randomTerm(random));
      const b = normalize(randomTerm(random));
      if (lengthBandExcludes(a, b, threshold)) {
        expect(similarityOfNormalized(a, b)).toBeLessThan(threshold);
      }
    }
  });
});

describe('findBestSimilarity', () => {
  it('classifies identically to a naive full scan on a randomized sweep', async () => {
    const random = createRandom(42);
    const candidates = Array.from({ length: 40 }, () => normalize(randomTerm(random)));
    const targets = Array.from({ length: 30 }, () => normalize(randomTerm(random)));
    const threshold = 0.8;

    for (const target of targets) {
      const naive = naiveBestSimilarity(target, candidates);
      const optimized = await findBestSimilarity(target, candidates, {
        threshold,
        chunkSize: Number.MAX_SAFE_INTEGER,
      });

      const naiveQualifies = naive.similarity >= threshold;
      const optimizedQualifies = optimized.similarity >= threshold;
      expect(optimizedQualifies).toBe(naiveQualifies);
      if (naiveQualifies) {
        // Winners that matter (at or above threshold) must match exactly.
        expect(optimized.similarity).toBe(naive.similarity);
        expect(optimized.term).toBe(naive.term);
      }
    }
  });

  it('produces the same result regardless of chunk size', async () => {
    const candidates = ['house', 'test', 'dog', 'cat', 'horse', 'testing', 'ok'];
    const target = normalize('tests');

    const unchunked = await findBestSimilarity(target, candidates, {
      threshold: 0.8,
      chunkSize: Number.MAX_SAFE_INTEGER,
    });
    const chunked = await findBestSimilarity(target, candidates, {
      threshold: 0.8,
      chunkSize: 3,
    });

    expect(chunked).toEqual(unchunked);
  });

  it('yields to the event loop every chunkSize candidates', async () => {
    const candidates = Array.from({ length: 10 }, (_, i) => `term${i}`);
    const yields: [number, number][] = [];

    await findBestSimilarity('target', candidates, {
      threshold: 0.8,
      chunkSize: 3,
      onYield: (processed, total) => yields.push([processed, total]),
    });

    expect(yields).toEqual([
      [3, 10],
      [6, 10],
      [9, 10],
    ]);
  });

  it('finds a qualifying match and reports it with exact similarity', async () => {
    const candidates = ['house', 'test', 'tests'];
    const result = await findBestSimilarity('tests', candidates, { threshold: 0.8 });

    expect(result.term).toBe('tests');
    expect(result.similarity).toBe(1);
  });

  it('returns similarity 0 when every candidate is excluded by the band', async () => {
    const candidates = ['abcdefghij', 'klmnopqrst'];
    const result = await findBestSimilarity('xy', candidates, { threshold: 0.8 });

    expect(result.similarity).toBe(0);
    expect(result.term).toBe('');
  });
});
