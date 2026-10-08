import { describe, it, expect, vi } from 'vitest';
import { clusterBySimilarity, cosineSimilarity } from '../../../src/services/grouping/clustering';
import { tfidfGrouping } from '../../../src/services/grouping/tfidfGrouping';
import type { Association } from '../../../src/types';

let mockSemanticGrouping: ReturnType<typeof vi.fn>;

vi.mock('../../../src/services/grouping/semanticGrouping', () => ({
  semanticGrouping: vi.fn(),
}));

const { semanticGrouping } = await import('../../../src/services/grouping/semanticGrouping');
mockSemanticGrouping = semanticGrouping as ReturnType<typeof vi.fn>;

describe('clustering', () => {
  it('computes cosine similarity between unit vectors', () => {
    expect(cosineSimilarity([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    expect(cosineSimilarity([1, 0], [0, 0])).toBe(0);
  });

  it('groups vectors above the similarity threshold', () => {
    const vectors = [
      [1, 0, 0, 0],
      [0.9, 0.1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0.8, 0.2],
    ];
    const suggestions = clusterBySimilarity(vectors, ['A', 'B', 'C', 'D'], 0.5);
    expect(suggestions).toHaveLength(2);
    expect(suggestions.map((g) => g.indices.slice().sort())).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([0, 1]),
        expect.arrayContaining([2, 3]),
      ])
    );
  });

  it('merges clusters smaller than the minimum group size into the nearest qualifying cluster', () => {
    const vectors = [
      [1, 0, 0, 0],
      [0.9, 0.1, 0, 0],
      [0, 0, 1, 0],
    ];
    const suggestions = clusterBySimilarity(vectors, ['A', 'B', 'C'], 0.5);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].indices.sort()).toEqual([0, 1, 2]);
  });
});

describe('tfidfGrouping', () => {
  it('groups phrasal verbs that share particles', () => {
    const items = [
      'Put off Posponer',
      'Take off Despegar',
      'Call off Cancelar',
      'Break down Desglosar',
      'Give up Rendirse',
      'Look up Admirar',
    ];
    const suggestions = tfidfGrouping(items, 2);
    const offGroup = suggestions.find((g) => g.indices.includes(0) && g.indices.includes(1) && g.indices.includes(2));
    expect(offGroup).toBeDefined();
  });

  it('groups items that share keywords', () => {
    const items = ['Perro Animal', 'Gato Animal', 'Coche Vehiculo', 'Avion Vehiculo'];
    const suggestions = tfidfGrouping(items, 2);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].indices).toEqual(expect.arrayContaining([0, 1]));
  });

  it('returns a single group for two items', () => {
    const suggestions = tfidfGrouping(['A', 'B']);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].indices.sort()).toEqual([0, 1]);
  });
});

describe('clusterBySimilarity edge cases', () => {
  it('merges small clusters to reach the configured minimum group size', () => {
    const vectors = [
      [1, 0, 0],
      [0.9, 0.1, 0],
      [0, 1, 0],
      [0, 0.9, 0.1],
    ];
    const suggestions = clusterBySimilarity(vectors, ['A', 'B', 'C', 'D'], 0.5, 4);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].indices.sort()).toEqual([0, 1, 2, 3]);
  });

  it('handles empty vectors array', () => {
    const suggestions = clusterBySimilarity([], [], 0.5);
    expect(suggestions).toHaveLength(0);
  });

  it('filters out single vectors below minimum group size', () => {
    const suggestions = clusterBySimilarity([[1, 0]], ['A'], 0.5);
    expect(suggestions).toHaveLength(0);
  });
});
