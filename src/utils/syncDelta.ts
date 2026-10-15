import type { Association } from '../types';

export interface AssociationDelta {
  id: string;
  fields: Partial<Pick<Association,
    'isLearned' | 'currentCycle' | 'status' |
    'hits' | 'misses' | 'timesPlayed' | 'lastPlayedAt'
  >>;
  updatedAt: number;
}

const SYNC_FIELDS: Array<keyof AssociationDelta['fields']> = [
  'isLearned',
  'currentCycle',
  'status',
  'hits',
  'misses',
  'timesPlayed',
  'lastPlayedAt',
];

function hasMeaningfulChange(prev: Association, next: Association): boolean {
  return SYNC_FIELDS.some((field) => prev[field] !== next[field]);
}

function extractSyncFields(assoc: Association): AssociationDelta['fields'] {
  const fields: AssociationDelta['fields'] = {};
  for (const field of SYNC_FIELDS) {
    const value = assoc[field];
    if (value !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (fields as any)[field] = value;
    }
  }
  return fields;
}

export function computeDelta(
  prevAssociations: Association[] | Record<string, Association>,
  nextAssociations: Association[] | Record<string, Association>
): AssociationDelta[] {
  const prevArray: Association[] = Array.isArray(prevAssociations) ? prevAssociations : Object.values(prevAssociations || {}) as Association[];
  const nextArray: Association[] = Array.isArray(nextAssociations) ? nextAssociations : Object.values(nextAssociations || {}) as Association[];
  const prevMap = new Map(prevArray.map((a) => [a.id, a]));
  const deltas: AssociationDelta[] = [];

  for (const next of nextArray) {
    const prev = prevMap.get(next.id);
    if (!prev || hasMeaningfulChange(prev, next)) {
      deltas.push({
        id: next.id,
        fields: extractSyncFields(next),
        updatedAt: next.updatedAt ?? Date.now(),
      });
    }
  }

  return deltas;
}

export function mergeCloudWins(
  localList: { associations: Association[] | Record<string, Association> },
  cloudList: { associations: Association[] | Record<string, Association> }
): { associations: Association[] } {
  const localArray: Association[] = Array.isArray(localList.associations) ? localList.associations : Object.values(localList.associations || {}) as Association[];
  const cloudArray: Association[] = Array.isArray(cloudList.associations) ? cloudList.associations : Object.values(cloudList.associations || {}) as Association[];
  const cloudMap = new Map(cloudArray.map((a) => [a.id, a]));
  const merged = localArray.map((local) => {
    const cloud = cloudMap.get(local.id);
    return cloud ?? local;
  });

  const cloudOnly = cloudArray.filter((a) => !localArray.some((l) => l.id === a.id));
  
  return { associations: [...merged, ...cloudOnly] };
}

export function serializeDeltasForKeepalive(
  listId: string,
  baseUpdatedAt: number,
  deltas: AssociationDelta[]
): string {
  return JSON.stringify({ listId, baseUpdatedAt, deltas });
}

// The updateListFields schema rejects anything but a non-negative integer, so a
// string (ISO date from the cloud) or a float leaves the payload wedged in
// pendingDeltas and re-sent on every load. Returns null when the value cannot
// be interpreted as a timestamp at all.
export function toEpochMs(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? Math.round(value) : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      return asNumber >= 0 ? Math.round(asNumber) : null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) && time >= 0 ? time : null;
  }
  return null;
}

function sanitizeIntegerField(value: unknown, min: number): number | null {
  const asNumber = Number(value);
  if (!Number.isFinite(asNumber)) return null;
  return Math.max(min, Math.round(asNumber));
}

// Normalise a delta so it always satisfies UpdateListFieldsSchema: a non-empty
// id, an integer updatedAt >= 0, currentCycle >= 1 and integer stats. Deltas
// without an id cannot be addressed by the server at all, so they are dropped;
// every other invalid value is repaired or removed without losing the delta.
export function sanitizeDeltas(deltas: AssociationDelta[]): AssociationDelta[] {
  const cleaned: AssociationDelta[] = [];

  for (const delta of deltas) {
    if (typeof delta.id !== 'string' || delta.id.trim() === '') continue;

    const updatedAt = toEpochMs(delta.updatedAt) ?? Date.now();
    const source = delta.fields ?? {};
    const fields: AssociationDelta['fields'] = {};

    if (typeof source.isLearned === 'boolean') {
      fields.isLearned = source.isLearned;
    }
    if (source.currentCycle !== undefined) {
      const currentCycle = sanitizeIntegerField(source.currentCycle, 1);
      fields.currentCycle = currentCycle === null ? 1 : currentCycle;
    }
    if (source.status === 'pending' || source.status === 'correct') {
      fields.status = source.status;
    }
    for (const statField of ['hits', 'misses', 'timesPlayed', 'lastPlayedAt'] as const) {
      const value = source[statField];
      if (value === undefined) continue;
      const sanitized = sanitizeIntegerField(value, 0);
      if (sanitized !== null) fields[statField] = sanitized;
    }

    cleaned.push({ id: delta.id.trim(), fields, updatedAt });
  }

  return cleaned;
}

// maxCount mirrors the `deltas.max(500)` rule of UpdateListFieldsSchema: a
// larger single payload is answered with 400 and never acknowledged.
export function chunkDeltas(
  deltas: AssociationDelta[],
  maxBytes: number,
  maxCount = 500
): AssociationDelta[][] {
  const sorted = [...deltas].sort((a, b) => b.updatedAt - a.updatedAt);
  const chunks: AssociationDelta[][] = [];
  let currentChunk: AssociationDelta[] = [];
  let currentSize = 0;

  for (const delta of sorted) {
    const deltaSize = JSON.stringify(delta).length;
    const overSize = currentSize + deltaSize > maxBytes && currentChunk.length > 0;
    const overCount = currentChunk.length >= maxCount;
    if (overSize || overCount) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentSize = 0;
    }
    currentChunk.push(delta);
    currentSize += deltaSize;
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  return chunks;
}