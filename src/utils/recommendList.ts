import { AssociationList } from "../types";
import { ListRecommendation } from "../types/recommendation";
import { normalizeText } from "./text";

const CONCEPT_WEIGHT = 0.6;
const CONTENT_WEIGHT = 0.4;
const RELEVANCE_WEIGHT = 0.75;
const BALANCE_WEIGHT = 0.25;

function tokenize(text: string): string[] {
  return normalizeText(text).split(/[^a-z0-9]+/i).filter(Boolean);
}

function uniqueTokens(texts: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const text of texts) {
    for (const token of tokenize(text)) {
      tokens.add(token);
    }
  }
  return tokens;
}

function activeAssociations(list: AssociationList) {
  return (list.associations || []).filter((a) => !a.isArchived);
}

function overlapCount(tokens: Set<string>, haystack: Set<string>): number {
  let count = 0;
  for (const token of tokens) {
    if (haystack.has(token)) count += 1;
  }
  return count;
}

/**
 * Suggests the best lists to add a new association to.
 *
 * Scoring combines relevance (how well the new value matches each list's
 * concept and existing vocabulary) with balance (preferring lists with fewer
 * active items) so new values are distributed across lists.
 */
export function recommendListsFor(
  term: string,
  definition: string,
  lists: AssociationList[],
): ListRecommendation[] {
  const activeLists = lists.filter((list) => !list.isArchived);
  if (activeLists.length === 0) return [];

  const newTokens = uniqueTokens([term, definition]);

  const listScores = activeLists.map((list) => {
    const conceptTokens = uniqueTokens([list.concept]);
    const contentTokens = uniqueTokens(
      activeAssociations(list).flatMap((a) => [a.term, ...a.definition]),
    );

    const totalTokens = newTokens.size;
    const conceptHits = overlapCount(newTokens, conceptTokens);
    const contentHits = overlapCount(newTokens, contentTokens);

    const conceptScore = totalTokens > 0 ? conceptHits / totalTokens : 0;
    const contentScore = totalTokens > 0 ? contentHits / totalTokens : 0;
    const relevance = conceptScore * CONCEPT_WEIGHT + contentScore * CONTENT_WEIGHT;

    return { list, relevance, conceptHits, contentHits };
  });

  const maxSize = Math.max(
    1,
    ...activeLists.map((list) => activeAssociations(list).length),
  );

  return listScores
    .map(({ list, relevance, conceptHits, contentHits }) => {
      const activeSize = activeAssociations(list).length;
      const balance = 1 - activeSize / maxSize;
      const score = relevance * RELEVANCE_WEIGHT + balance * BALANCE_WEIGHT;

      const reasons: string[] = [];
      if (conceptHits > 0) {
        reasons.push(`Coincide con el tema "${list.concept}"`);
      }
      if (contentHits > 0) {
        reasons.push(`Comparte vocabulario con ${contentHits} elemento(s) de la lista`);
      }
      if (activeSize === 0) {
        reasons.push("Lista sin elementos");
      }

      return { list, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}
