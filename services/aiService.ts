import { callFunction } from './callFunction';
import { Association } from '../types';

export interface AIGroupSuggestion {
  groupName: string;
  indices: number[];
}

export const aiService = {
  groupAssociations: async (associations: Association[], concept: string): Promise<AIGroupSuggestion[]> => {
    const dataToProcess = associations.map((a) => ({
      term: a.term,
      definition: a.definition,
    }));

    return callFunction<AIGroupSuggestion[]>('aiGroup', {
      concept,
      associations: dataToProcess,
    });
  }
};
