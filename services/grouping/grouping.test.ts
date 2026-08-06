import { describe, it, expect, vi } from 'vitest';
import { clusterBySimilarity, cosineSimilarity } from './clustering';
import { tfidfGrouping } from './tfidfGrouping';
import { aiService } from '../aiService';
import { semanticGrouping } from './semanticGrouping';
import { Association } from '../../types';

vi.mock('./semanticGrouping', () => ({
  semanticGrouping: vi.fn(),
}));

const mockedSemanticGrouping = vi.mocked(semanticGrouping);

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

  it('drops clusters smaller than the minimum group size', () => {
    const vectors = [
      [1, 0, 0, 0],
      [0.9, 0.1, 0, 0],
      [0, 0, 1, 0],
    ];
    const suggestions = clusterBySimilarity(vectors, ['A', 'B', 'C'], 0.5);
    expect(suggestions).toHaveLength(1);
    expect(suggestions[0].indices).toEqual(expect.arrayContaining([0, 1]));
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
    const offGroup = suggestions.find((g) => g.indices.length === 3);
    expect(offGroup).toBeDefined();
    expect(offGroup?.indices).toEqual(expect.arrayContaining([0, 1, 2]));
  });

  it('groups items that share keywords', () => {
    const items = ['Perro Animal', 'Gato Animal', 'Coche Vehiculo', 'Avion Vehiculo'];
    const suggestions = tfidfGrouping(items, 2);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].indices).toEqual(expect.arrayContaining([0, 1]));
  });

  it('returns empty for fewer than three items', () => {
    expect(tfidfGrouping(['A', 'B'])).toEqual([]);
  });
});

describe('aiService.groupAssociations', () => {
  const associations: Association[] = [
    { id: '1', term: 'Put off', definition: 'Posponer', currentCycle: 1, status: 'pending', isLearned: false, isArchived: false },
    { id: '2', term: 'Take off', definition: 'Despegar', currentCycle: 1, status: 'pending', isLearned: false, isArchived: false },
    { id: '3', term: 'Call off', definition: 'Cancelar', currentCycle: 1, status: 'pending', isLearned: false, isArchived: false },
  ];

  it('uses semantic grouping when available', async () => {
    mockedSemanticGrouping.mockResolvedValue([{ groupName: 'Phrasal', indices: [0, 1, 2] }]);
    const suggestions = await aiService.groupAssociations(associations, 'Phrasal verbs');
    expect(suggestions).toEqual([{ groupName: 'Phrasal', indices: [0, 1, 2] }]);
  });

  it('falls back to keyword grouping when semantic grouping is unavailable', async () => {
    mockedSemanticGrouping.mockResolvedValue(null);
    const suggestions = await aiService.groupAssociations(associations, 'Phrasal verbs');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].indices).toEqual(expect.arrayContaining([0, 1, 2]));
  });

  it('returns empty for fewer than three associations', async () => {
    const suggestions = await aiService.groupAssociations(associations.slice(0, 2), 'Phrasal verbs');
    expect(suggestions).toEqual([]);
  });
});
