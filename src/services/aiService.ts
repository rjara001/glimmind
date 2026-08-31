import { Association } from '../types';
import { joinDefinitions } from '../utils/normalizeAssociation';
import { MIN_GROUP_SIZE, MIN_GROUP_SIZE_ABSOLUTE, MIN_GROUP_SIZE_RATIO } from '../constants/limits';
import { semanticGrouping } from './grouping/semanticGrouping';
import { tfidfGrouping } from './grouping/tfidfGrouping';
import { GroupSuggestion } from './grouping/clustering';

export type { GroupSuggestion as AIGroupSuggestion };

const computeMinGroupSize = (count: number): number =>
  Math.max(MIN_GROUP_SIZE_ABSOLUTE, Math.round(MIN_GROUP_SIZE_RATIO * count));

export const aiService = {
  groupAssociations: async (associations: Association[], _concept: string): Promise<GroupSuggestion[]> => {
    const activeAssociations = associations.filter((a) => !a.isArchived);
    if (activeAssociations.length < MIN_GROUP_SIZE) {
      return [];
    }

    const items = activeAssociations.map((a) => `${a.term} ${joinDefinitions(a.definition)}`.trim());
    const minGroupSize = computeMinGroupSize(activeAssociations.length);

    const semanticSuggestions = await semanticGrouping(items, minGroupSize);
    if (semanticSuggestions) {
      return semanticSuggestions;
    }

    return tfidfGrouping(items, minGroupSize);
  }
};
