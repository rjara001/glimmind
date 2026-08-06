import { Association } from '../types';
import { semanticGrouping } from './grouping/semanticGrouping';
import { tfidfGrouping } from './grouping/tfidfGrouping';
import { GroupSuggestion } from './grouping/clustering';

export type { GroupSuggestion as AIGroupSuggestion };

export const aiService = {
  groupAssociations: async (associations: Association[], _concept: string): Promise<GroupSuggestion[]> => {
    const activeAssociations = associations.filter((a) => !a.isArchived);
    if (activeAssociations.length < 3) {
      return [];
    }

    const items = activeAssociations.map((a) => `${a.term} ${a.definition}`.trim());

    const semanticSuggestions = await semanticGrouping(items);
    if (semanticSuggestions) {
      return semanticSuggestions;
    }

    return tfidfGrouping(items);
  }
};
