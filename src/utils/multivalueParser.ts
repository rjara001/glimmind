import { Association } from "../types";

const SLASH_SEPARATOR = "/";

function splitParts(value: string): string[] {
  return value
    .split(SLASH_SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

/**
 * Captures slash-separated definition values as `multivalues` before
 * flattening. When the term is a single Key and the definition carries
 * multiple accepted renderings (e.g. "Estoy de acuerdo/Me copa"), those
 * renderings are preserved so the bidirectional engine can validate them
 * individually instead of flattening them into separate cards.
 */
export function captureMultivalues(association: Association): Association {
  if (association.multivalues && association.multivalues.length > 0) {
    return association;
  }
  const terms = splitParts(association.term);
  const definitions = splitParts(association.definition);
  if (terms.length <= 1 && definitions.length > 1) {
    return { ...association, multivalues: definitions };
  }
  return association;
}

export function captureMultivaluesForMany(associations: Association[]): Association[] {
  let changed = false;
  const result = associations.map((association) => {
    const next = captureMultivalues(association);
    if (next !== association) changed = true;
    return next;
  });
  return changed ? result : associations;
}

/**
 * Groups associations that share the same term (Key) into a single card whose
 * definitions become `multivalues`. This handles data that already presents the
 * multivalue as repeated rows, e.g.:
 *
 *   "I'm down" | "Estoy de acuerdo"
 *   "I'm down" | "Me copa"
 *
 * becomes one card with key "I'm down" and multivalues ["Estoy de acuerdo", "Me copa"].
 *
 * Semantics:
 * - Only rows with a single term (no slashes) are candidates for grouping.
 * - Rows are grouped by a case-insensitive, trimmed term.
 * - The merged card keeps the first row's id and metadata but resets progress
 *   (pending, cycle 1, no hits/misses) as if it were new.
 * - Existing `multivalues` on a row are folded into the group's multivalues.
 * - Archived rows never participate in merging and pass through unchanged.
 */
export function mergeRepeatedTermAssociations(associations: Association[]): Association[] {
  let changed = false;
  const result: Association[] = [];
  const groups = new Map<string, Association[]>();

  for (const association of associations) {
    if (association.isArchived || splitParts(association.term).length > 1) {
      result.push(association);
      continue;
    }
    const key = association.term.trim().toLowerCase();
    if (key.length === 0) {
      result.push(association);
      continue;
    }
    const group = groups.get(key);
    if (group) group.push(association);
    else groups.set(key, [association]);
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }
    changed = true;

    const definitions: string[] = [];
    for (const association of group) {
      if (association.multivalues && association.multivalues.length > 0) {
        definitions.push(...association.multivalues);
      } else {
        definitions.push(association.definition);
      }
    }

    const first = group[0];
    result.push({
      ...first,
      id: crypto.randomUUID(),
      term: first.term.trim(),
      definition: first.definition.trim(),
      multivalues: dedupeStrings(definitions),
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
      hits: undefined,
      misses: undefined,
      timesPlayed: undefined,
      lastPlayedAt: undefined,
    });
  }

  return changed ? result : associations;
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const key = value.trim().toLowerCase();
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push(value.trim());
  }
  return result;
}