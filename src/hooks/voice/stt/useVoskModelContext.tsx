import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createModel, Model } from 'vosk-browser';

const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz';

interface VoskModelContextValue {
  isReady: boolean;
  error: string | null;
  model: Model | null;
}

const VoskModelContext = createContext<VoskModelContextValue | null>(null);

export function VoskModelProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<Model | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function preload() {
      try {
        const loaded = await createModel(MODEL_URL);
        if (!cancelled) {
          setModel(loaded);
          setIsReady(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to preload Vosk model.';
          setError(message);
          setIsReady(false);
        }
      }
    }

    preload();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <VoskModelContext.Provider value={{ isReady, error, model }}>
      {children}
    </VoskModelContext.Provider>
  );
}

export function useVoskModel() {
  const context = useContext(VoskModelContext);
  if (!context) {
    throw new Error('useVoskModel must be used within VoskModelProvider');
  }
  return context;
}
