import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { createModel, Model } from 'vosk-browser';

const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz';

interface VoskModelContextType {
  model: Model | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  load: () => Promise<Model | null>;
}

const VoskModelContext = createContext<VoskModelContextType>({
  model: null,
  isReady: false,
  isLoading: false,
  error: null,
  load: async () => null,
});

export const VoskModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPromiseRef = useRef<Promise<Model | null> | null>(null);

  const load = useCallback((): Promise<Model | null> => {
    if (loadPromiseRef.current) return loadPromiseRef.current;

    setIsLoading(true);
    setError(null);

    const promise = createModel(MODEL_URL).then(
      (loadedModel) => {
        setModel(loadedModel);
        setIsReady(true);
        setIsLoading(false);
        return loadedModel;
      },
      (err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Unknown error loading the Vosk model';
        console.error('[Vosk Engine] Failed to load model:', msg);
        setError(msg);
        setIsLoading(false);
        loadPromiseRef.current = null;
        return null;
      },
    );

    loadPromiseRef.current = promise;
    return promise;
  }, []);

  return (
    <VoskModelContext.Provider value={{ model, isReady, isLoading, error, load }}>
      {children}
    </VoskModelContext.Provider>
  );
};

export const useVoskModelContext = () => useContext(VoskModelContext);