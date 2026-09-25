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

export function chunkDeltas(
  deltas: AssociationDelta[],
  maxBytes: number
): AssociationDelta[][] {
  const sorted = [...deltas].sort((a, b) => b.updatedAt - a.updatedAt);
  const chunks: AssociationDelta[][] = [];
  let currentChunk: AssociationDelta[] = [];
  let currentSize = 0;

  for (const delta of sorted) {
    const deltaSize = JSON.stringify(delta).length;
    if (currentSize + deltaSize > maxBytes && currentChunk.length > 0) {
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