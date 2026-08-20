import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createModel, Model } from 'vosk-browser';

const MODEL_URL = '/models/vosk-model-small-en-us-0.15.tar.gz';

interface VoskModelContextType {
  model: Model | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
}

const VoskModelContext = createContext<VoskModelContextType>({
  model: null,
  isReady: false,
  isLoading: false,
  error: null,
});

export const VoskModelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModel] = useState<Model | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasStartedFetching = useRef(false);

  useEffect(() => {
    if (hasStartedFetching.current) return;
    hasStartedFetching.current = true;

    const initVosk = async () => {
      console.log('[Vosk Engine] 🚀 Descargando modelo en segundo plano al inicio...');
      console.time('[Vosk Engine] TIEMPO CARGA MODELO');
      setIsLoading(true);

      try {
        const loadedModel = await createModel(MODEL_URL);
        
        console.log('[Vosk Engine] ✅ Modelo descargado y listo en memoria.');
        console.timeEnd('[Vosk Engine] TIEMPO CARGA MODELO');
        
        setModel(loadedModel);
        setIsReady(true);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido descargando Vosk';
        console.error('[Vosk Engine] ❌ Error:', msg);
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };

    initVosk();
  }, []);

  return (
    <VoskModelContext.Provider value={{ model, isReady, isLoading, error }}>
      {children}
    </VoskModelContext.Provider>
  );
};

export const useVoskModelContext = () => useContext(VoskModelContext);