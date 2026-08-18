import { Association } from "../types";

const SLASH_SEPARATOR = "/";

function splitParts(value: string): string[] {
  return value
    .split(SLASH_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function cloneAssociation(association: Association, term: string, definition: string): Association {
  return {
    ...association,
    id: crypto.randomUUID(),
    term,
    definition,
  };
}

/**
 * Flattens associations whose term or definition contains multiple slash-separated
 * values into individual associations.
 *
 * Examples:
 * - term "A/B/C", definition "D"  -> A-D, B-D, C-D
 * - term "A", definition "B/C/D"  -> A-B, A-C, A-D
 * - term "A/B/C", definition "1/2/3" -> A-1, B-2, C-3 (paired by position)
 *
 * Associations with multiple slash-separated values on both sides with different
 * counts are left untouched. Associations without slashes are returned unchanged.
 */
export function flattenAssociations(associations: Association[]): Association[] {
  let changed = false;
  const flattened: Association[] = [];

  for (const association of associations) {
    const terms = splitParts(association.term);
    const definitions = splitParts(association.definition);

    const hasSingleTerm = terms.length <= 1;
    const hasSingleDefinition = definitions.length <= 1;

    if (hasSingleTerm && hasSingleDefinition) {
      flattened.push(association);
      continue;
    }

    if (hasSingleTerm) {
      const singleTerm = terms[0] || association.term;
      for (const definition of definitions) {
        flattened.push(cloneAssociation(association, singleTerm, definition));
      }
      changed = true;
      continue;
    }

    if (hasSingleDefinition) {
      const singleDefinition = definitions[0] || association.definition;
      for (const term of terms) {
        flattened.push(cloneAssociation(association, term, singleDefinition));
      }
      changed = true;
      continue;
    }

    if (terms.length === definitions.length) {
      for (let i = 0; i < terms.length; i += 1) {
        flattened.push(cloneAssociation(association, terms[i], definitions[i]));
      }
      changed = true;
      continue;
    }

    flattened.push(association);
  }

  return changed ? flattened : associations;
}
