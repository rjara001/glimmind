
export const calculateSimilarity = (str1: string, str2: string): number => {
  const s1 = normalize(str1);
  const s2 = normalize(str2);
  return similarityOfNormalized(s1, s2);
};

export const normalize = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[-–—]+/g, ' ')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/gi, '');
};

export const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  // Two rolling rows instead of a full (a.length+1) x (b.length+1) matrix.
  // Same exact result, O(min(a,b)) memory instead of O(a*b) allocations.
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    const swap = prev;
    prev = curr;
    curr = swap;
  }
  return prev[b.length];
};

/**
 * Similarity of two PRE-normalized strings. Skips the normalize() cost that
 * calculateSimilarity pays on every call.
 */
export const similarityOfNormalized = (s1: string, s2: string): number => {
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const editDistance = levenshteinDistance(s1, s2);
  const maxLength = Math.max(s1.length, s2.length);

  return (maxLength - editDistance) / maxLength;
};

/** Pairs whose lengths differ by more than this band can never reach `threshold`. */
const LENGTH_BAND_EPSILON = 1e-9;

/**
 * Largest edit distance that can still reach `threshold`:
 * sim = (max - dist) / max >= threshold <=> dist <= (1 - threshold) * max.
 */
export const maxAllowedDistance = (
  a: string,
  b: string,
  threshold: number,
): number => {
  const maxLength = Math.max(a.length, b.length);
  return Math.floor((1 - threshold) * maxLength + LENGTH_BAND_EPSILON);
};

/**
 * Strict mathematical pruning: for sim = (max - dist) / max >= threshold it
 * must hold that dist <= (1 - threshold) * max, and by the triangle
 * inequality dist >= |len(a) - len(b)|. Therefore any pair failing the band
 * check has similarity strictly below `threshold` and can be skipped without
 * changing which candidates qualify.
 *
 * The epsilon only makes the band slightly more permissive (FP safety for
 * values like 1 - 0.8), so this never prunes a pair that could qualify.
 */
export const lengthBandExcludes = (
  a: string,
  b: string,
  threshold: number,
): boolean => {
  if (a === b) return false;
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return false;
  return Math.abs(a.length - b.length) > maxAllowedDistance(a, b, threshold);
};

/**
 * Levenshtein distance with an early-abort cap: returns the exact distance
 * when it is <= cap, otherwise cap + 1. Rows that rise entirely above the
 * cap abort the computation, which is what makes large validation scans
 * fast: unrelated terms give up after a handful of rows instead of
 * allocating a full O(len x len) alignment.
 */
export const levenshteinDistanceCapped = (
  a: string,
  b: string,
  cap: number,
): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  if (a.length === 0) return Math.min(b.length, cap + 1);
  if (b.length === 0) return Math.min(a.length, cap + 1);

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      const value = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      curr[j] = value;
      if (value < rowMin) rowMin = value;
    }
    // Every alignment reaching this row costs more than cap: the final
    // distance cannot be <= cap.
    if (rowMin > cap) return cap + 1;
    const swap = prev;
    prev = curr;
    curr = swap;
  }

  return prev[b.length] > cap ? cap + 1 : prev[b.length];
};

let yieldChannel: MessageChannel | null = null;

/**
 * Yields to the event loop so React can paint and the UI stays responsive
 * during long chunked scans. Uses a MessageChannel (a macrotask without the
 * setTimeout ~1-4ms clamp) and falls back to setTimeout(0) when unavailable.
 */
export const yieldToEventLoop = (): Promise<void> => {
  if (typeof MessageChannel === 'undefined') {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }
  if (!yieldChannel) yieldChannel = new MessageChannel();
  return new Promise((resolve) => {
    yieldChannel!.port1.onmessage = () => resolve();
    yieldChannel!.port2.postMessage(null);
  });
};

/** Pairs processed between event-loop yields inside findBestSimilarity. */
export const DEFAULT_SCAN_CHUNK_SIZE = 1000;

/** Cards processed between event-loop yields in chunked validation loops. */
export const SCAN_CARD_YIELD_EVERY = 200;

export interface ScanProgress {
  processed: number;
  total: number;
}

export interface ChunkedScanOptions {
  chunkSize?: number;
  onProgress?: (progress: ScanProgress) => void;
}

export interface BestSimilarityMatch {
  similarity: number;
  term: string;
}

export interface FindBestSimilarityOptions {
  /** Minimum similarity that matters; used for the strict length band. */
  threshold: number;
  chunkSize?: number;
  /** Fired before each event-loop yield with candidate-index progress. */
  onYield?: (processedCandidates: number, totalCandidates: number) => void;
}

/**
 * Finds the best similarity between `targetNorm` and an iterable of
 * pre-normalized candidates. Pairs that cannot reach `threshold` (length
 * band or capped distance) are skipped; every pair that can reach it is
 * evaluated exactly, in the same order, with the same first-wins tie-breaking
 * as a full scan. Therefore classification via `best.similarity >= threshold`
 * and the winner for qualifying pairs are identical to the old full
 * O(N x M) scan, while non-qualifying pairs may report a capped value.
 *
 * Yields to the event loop every `chunkSize` pairs so the UI never freezes.
 */
export async function findBestSimilarity(
  targetNorm: string,
  candidates: Iterable<string>,
  options: FindBestSimilarityOptions,
): Promise<BestSimilarityMatch> {
  const { threshold, chunkSize = DEFAULT_SCAN_CHUNK_SIZE, onYield } = options;
  const list = Array.isArray(candidates)
    ? (candidates as string[])
    : Array.from(candidates);

  let bestSimilarity = 0;
  let bestTerm = '';
  let sinceYield = 0;

  for (let i = 0; i < list.length; i++) {
    const candidate = list[i];
    if (!lengthBandExcludes(targetNorm, candidate, threshold)) {
      // Only pairs that can still reach the threshold are computed, and the
      // distance is capped: unrelated terms abort after a few DP rows. The
      // exact distance (and therefore the exact similarity) is returned for
      // every pair that qualifies, so winners are identical to a full scan.
      const cap = maxAllowedDistance(targetNorm, candidate, threshold);
      const distance = levenshteinDistanceCapped(targetNorm, candidate, cap);
      if (distance <= cap) {
        const maxLength = Math.max(targetNorm.length, candidate.length);
        const sim = (maxLength - distance) / maxLength;
        if (sim > bestSimilarity) {
          bestSimilarity = sim;
          bestTerm = candidate;
          if (sim >= 1) break;
        }
      }
    }
    sinceYield++;
    if (sinceYield >= chunkSize) {
      sinceYield = 0;
      onYield?.(i + 1, list.length);
      await yieldToEventLoop();
    }
  }

  return { similarity: bestSimilarity, term: bestTerm };
}
