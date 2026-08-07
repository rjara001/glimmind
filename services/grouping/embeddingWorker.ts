import { EMBEDDING_MODEL_ID } from '../../constants/limits';

export interface EmbeddingRequest {
  type: 'embed';
  id: number;
  texts: string[];
}

export interface EmbeddingProgressMessage {
  type: 'progress';
  payload: unknown;
}

export interface EmbeddingResultMessage {
  type: 'embed_result';
  id: number;
  vectors: number[][];
}

export interface EmbeddingErrorMessage {
  type: 'error';
  id: number;
  message: string;
}

export type EmbeddingWorkerMessage = EmbeddingRequest;
export type EmbeddingWorkerResponse =
  | EmbeddingProgressMessage
  | EmbeddingResultMessage
  | EmbeddingErrorMessage;

type WorkerContext = typeof self & {
  postMessage: (message: EmbeddingWorkerResponse) => void;
};

interface ExtractResult {
  tolist: () => number[][];
}

interface FeatureExtractor {
  (texts: string[], options: { pooling: string; normalize: boolean }): Promise<ExtractResult>;
}

interface TransformersModule {
  env: {
    allowLocalModels: boolean;
    useBrowserCache: boolean;
    backends: {
      onnx: {
        wasm: {
          wasmPaths: string;
          numThreads: number;
          proxy: boolean;
        };
      };
    };
  };
  pipeline: (task: string, model: string, options: Record<string, unknown>) => Promise<FeatureExtractor>;
}

const LIBRARY_URL = '/transformers.web.min.js';
const WASM_PATHS = '/onnx/';

let pipeline: FeatureExtractor | null = null;
let loadingPromise: Promise<FeatureExtractor> | null = null;

const getPipeline = (): Promise<FeatureExtractor> => {
  if (pipeline) return Promise.resolve(pipeline);
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const moduleUrl = new URL(LIBRARY_URL, self.location.origin).href;
    const module = (await import(/* @vite-ignore */ moduleUrl)) as unknown as TransformersModule;
    module.env.allowLocalModels = false;
    module.env.useBrowserCache = true;
    module.env.backends.onnx.wasm.wasmPaths = WASM_PATHS;
    module.env.backends.onnx.wasm.numThreads = 1;
    module.env.backends.onnx.wasm.proxy = false;

    try {
      pipeline = await module.pipeline('feature-extraction', EMBEDDING_MODEL_ID, {
        dtype: 'q8',
        device: 'webgpu',
        progress_callback: (progress: unknown) => {
          self.postMessage({ type: 'progress', payload: progress });
        },
      });
    } catch (webgpuError) {
      console.warn('[embeddingWorker] WebGPU unavailable, falling back to WASM:', webgpuError);
      pipeline = await module.pipeline('feature-extraction', EMBEDDING_MODEL_ID, {
        dtype: 'q8',
        progress_callback: (progress: unknown) => {
          self.postMessage({ type: 'progress', payload: progress });
        },
      });
    }
    return pipeline;
  })();

  return loadingPromise;
};

const workerContext = self as unknown as WorkerContext;

workerContext.onmessage = async (event: MessageEvent<EmbeddingRequest>): Promise<void> => {
  const { type, id, texts } = event.data;
  if (type !== 'embed') return;

  try {
    const extractor = await getPipeline();
    const output = await extractor(texts, { pooling: 'mean', normalize: true });
    const vectors: number[][] = output.tolist();
    workerContext.postMessage({ type: 'embed_result', id, vectors });
  } catch (error) {
    workerContext.postMessage({
      type: 'error',
      id,
      message: error instanceof Error ? error.message : 'Embedding failed',
    });
  }
};
