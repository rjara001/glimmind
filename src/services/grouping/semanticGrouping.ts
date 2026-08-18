import { clusterBySimilarity, GroupSuggestion } from './clustering';
import {
  EmbeddingErrorMessage,
  EmbeddingRequest,
  EmbeddingResultMessage,
} from './embeddingWorker';

const SIMILARITY_THRESHOLD = 0.45;
const EMBEDDING_TIMEOUT_MS = 10 * 60 * 1000;

export async function semanticGrouping(items: string[], minGroupSize?: number): Promise<GroupSuggestion[] | null> {
  if (typeof Worker === 'undefined') {
    return null;
  }

  const worker = new Worker(new URL('./embeddingWorker.ts', import.meta.url), { type: 'module' });

  const request: EmbeddingRequest = {
    type: 'embed',
    id: Date.now(),
    texts: items,
  };

  try {
    const vectors = await new Promise<number[][]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Embedding timed out'));
      }, EMBEDDING_TIMEOUT_MS);

      worker.onmessage = (event: MessageEvent<EmbeddingResultMessage | EmbeddingErrorMessage>) => {
        const message = event.data;
        if (message.type === 'embed_result' && message.id === request.id) {
          clearTimeout(timeout);
          resolve(message.vectors);
        } else if (message.type === 'error' && message.id === request.id) {
          clearTimeout(timeout);
          reject(new Error(message.message));
        }
      };

      worker.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Embedding worker error'));
      };

      worker.postMessage(request);
    });

    return clusterBySimilarity(vectors, items, SIMILARITY_THRESHOLD, minGroupSize);
  } catch (error) {
    return null;
  } finally {
    worker.terminate();
  }
}
