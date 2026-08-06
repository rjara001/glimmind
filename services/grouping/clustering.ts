import { MIN_GROUP_SIZE } from '../../constants/limits';

export interface GroupSuggestion {
  groupName: string;
  indices: number[];
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

interface Cluster {
  centroid: number[];
  members: number[][];
  indices: number[];
}

const addVectors = (target: number[], source: number[]): void => {
  for (let i = 0; i < target.length; i++) {
    target[i] += source[i];
  }
};

export function clusterBySimilarity(
  vectors: number[][],
  items: string[],
  similarityThreshold: number,
  minGroupSize: number = MIN_GROUP_SIZE
): GroupSuggestion[] {
  const clusters: Cluster[] = [];
  const dimensions = vectors[0]?.length ?? 0;

  for (let i = 0; i < vectors.length; i++) {
    const vector = vectors[i];
    let bestClusterIndex = -1;
    let bestSimilarity = similarityThreshold;
    for (let c = 0; c < clusters.length; c++) {
      const similarity = cosineSimilarity(vector, clusters[c].centroid);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestClusterIndex = c;
      }
    }

    if (bestClusterIndex >= 0) {
      const cluster = clusters[bestClusterIndex];
      cluster.members.push(vector);
      cluster.indices.push(i);
      const newCentroid = new Array(dimensions).fill(0);
      addVectors(newCentroid, cluster.centroid);
      addVectors(newCentroid, vector);
      for (let d = 0; d < dimensions; d++) {
        newCentroid[d] /= cluster.members.length;
      }
      cluster.centroid = newCentroid;
    } else {
      clusters.push({
        centroid: vector.slice(),
        members: [vector],
        indices: [i],
      });
    }
  }

  return clusters
    .filter((cluster) => cluster.indices.length >= minGroupSize)
    .map((cluster) => ({
      groupName: nearestItemName(cluster, vectors, items),
      indices: cluster.indices,
    }));
}

const nearestItemName = (cluster: Cluster, vectors: number[][], items: string[]): string => {
  let bestIndex = cluster.indices[0];
  let bestSimilarity = -Infinity;
  for (const index of cluster.indices) {
    const similarity = cosineSimilarity(vectors[index], cluster.centroid);
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity;
      bestIndex = index;
    }
  }
  const name = items[bestIndex]?.trim() || `Grupo ${cluster.indices.length}`;
  return name.charAt(0).toUpperCase() + name.slice(1);
};
