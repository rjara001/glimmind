import { callFunction } from './callFunction';
import { Association } from '../types';
import { MAX_CARDS_PER_AI_REQUEST } from '../constants/limits';

export interface AIGroupSuggestion {
  groupName: string;
  indices: number[];
}

export const aiService = {
  groupAssociations: async (associations: Association[], concept: string): Promise<AIGroupSuggestion[]> => {
    const dataToProcess = associations
      .slice(0, MAX_CARDS_PER_AI_REQUEST)
      .map((a) => ({
        term: a.term,
        definition: a.definition,
      }));

    return callFunction<AIGroupSuggestion[]>('aiGroup', {
      concept,
      associations: dataToProcess,
    });
  }
};
