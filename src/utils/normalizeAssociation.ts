import { Association } from "../types";

const PIPE_SEPARATOR = "|";
const SEPARATOR_REGEX = /[\/|]/;

/**
 * An association as it can arrive from a legacy source: `definition` may be a
 * single string (old 1:1 format or slash/pipe-separated multivalue) or already
 * an array. Never trusts persistence, so it always normalizes.
 */
export type AssociationLike = Omit<Association, "definition"> & {
  definition: string | string[];
};

function splitParts(value: string): string[] {
  return value
    .split(SEPARATOR_REGEX)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function dedupe(values: string[]): string[] {
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

/**
 * Converts any legacy definition value into a normalized, trimmed array of
 * accepted renderings. Splits on `/` or `|`, drops empties and exact
 * duplicates (case-insensitive).
 */
function toDefinitionArray(value: string | string[]): string[] {
  const parts: string[] = [];
  const values = Array.isArray(value) ? value : [value];
  for (const item of values) {
    parts.push(...splitParts(item));
  }
  return dedupe(parts);
}

/**
 * Parses an editor-edited definition string into an array, splitting on `|`.
 * Used by the grid when the user edits a definition cell.
 *
 * Unlike normalizeAssociation's internal splitting, this intentionally does NOT
 * trim whitespace from each part. Trimming would strip spaces the user is
 * actively typing (e.g. "la " becoming "la"), breaking live editing of
 * multi-word definitions. Whitespace cleanup happens later during
 * normalizeAssociations (via splitParts) when the list is saved.
 */
export function parseDefinitions(text: string): string[] {
  const parts = text.split(PIPE_SEPARATOR);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (key.length === 0 || seen.has(key)) continue;
    seen.add(key);
    result.push(part);
  }
  return result;
}

/**
 * Normalizes a batch of associations into the canonical `definition: string[]`
 * shape:
 *
 * - definition is coerced to a trimmed, deduplicated array (splitting legacy
 *   slash/pipe-separated strings).
 * - Rows that share the same term (Key) are merged into a single card whose
 *   definitions are folded together, preserving the repeated-rows multivalue
 *   that used to arrive as separate cards.
 * - Progress fields are reset on merged cards; archived rows never merge.
 *
 * Idempotent: running it again over already-normalized data is a no-op
 * (returns the same array reference when nothing changes).
 */
export function normalizeAssociations(associations: AssociationLike[]): Association[] {
  let changed = false;
  const result: Association[] = [];
  const groups = new Map<string, AssociationLike[]>();

  for (const association of associations) {
    if (association.isArchived) {
      const normalized = normalizeOne(association);
      if (normalized !== association) changed = true;
      result.push(normalized);
      continue;
    }
    const term = association.term.trim().toLowerCase();
    if (term.length === 0) {
      const normalized = normalizeOne(association);
      if (normalized !== association) changed = true;
      result.push(normalized);
      continue;
    }
    const group = groups.get(term);
    if (group) group.push(association);
    else groups.set(term, [association]);
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      const normalized = normalizeOne(group[0]);
      if (normalized !== group[0]) changed = true;
      result.push(normalized);
      continue;
    }
    changed = true;
    const definitions: string[] = [];
    let maxHits = 0;
    let maxMisses = 0;
    let maxTimesPlayed = 0;
    let maxCurrentCycle = 1;
    let isLearned = false;
    let isArchived = false;
    let maxLastPlayedAt = 0;
    let maxUpdatedAt = 0;
    let minCreatedAt = Infinity;
    let worstStatus: 'pending' | 'correct' = 'pending';
    for (const association of group) {
      definitions.push(...toDefinitionArray(association.definition));
      maxHits = Math.max(maxHits, association.hits ?? 0);
      maxMisses = Math.max(maxMisses, association.misses ?? 0);
      maxTimesPlayed = Math.max(maxTimesPlayed, association.timesPlayed ?? 0);
      maxCurrentCycle = Math.max(maxCurrentCycle, association.currentCycle ?? 1);
      isLearned = isLearned || association.isLearned;
      isArchived = isArchived || association.isArchived;
      if (association.lastPlayedAt) maxLastPlayedAt = Math.max(maxLastPlayedAt, association.lastPlayedAt);
      if (association.updatedAt) maxUpdatedAt = Math.max(maxUpdatedAt, association.updatedAt);
      if (association.createdAt) minCreatedAt = Math.min(minCreatedAt, association.createdAt);
      if (association.status === 'correct') worstStatus = 'correct';
    }
    const first = group[0];
    result.push({
      ...first,
      term: first.term.trim(),
      definition: dedupe(definitions),
      currentCycle: maxCurrentCycle,
      status: worstStatus,
      isLearned,
      isArchived,
      hits: maxHits > 0 ? maxHits : undefined,
      misses: maxMisses > 0 ? maxMisses : undefined,
      timesPlayed: maxTimesPlayed > 0 ? maxTimesPlayed : undefined,
      lastPlayedAt: maxLastPlayedAt > 0 ? maxLastPlayedAt : undefined,
      createdAt: minCreatedAt !== Infinity ? minCreatedAt : undefined,
      updatedAt: maxUpdatedAt > 0 ? maxUpdatedAt : undefined,
    } as Association);
  }

  return changed ? result : (associations as Association[]);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

/**
 * Renders a definition array as a single pipe-separated string for editing and
 * display in the grid (and other string consumers).
 */
export function joinDefinitions(definitions: string | string[]): string {
  const values = Array.isArray(definitions) ? definitions : [definitions];
  return values.join(` ${PIPE_SEPARATOR} `);
}

function normalizeOne(association: AssociationLike): Association {
  const definition = toDefinitionArray(association.definition);
  const term = association.term.trim();
  const alreadyNormalized =
    Array.isArray(association.definition) &&
    association.term === term &&
    arraysEqual(association.definition, definition);
  if (alreadyNormalized) {
    return association as Association;
  }
  return {
    ...association,
    term,
    definition,
  } as Association;
}
