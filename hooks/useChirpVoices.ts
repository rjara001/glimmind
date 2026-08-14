import { useState, useEffect, useCallback } from 'react';
import { listTtsVoices } from '../services/voice/chirpVoicesApi';
import { ChirpVoice } from '../../types';

export function useChirpVoices(lang?: string) {
  const [voices, setVoices] = useState<ChirpVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allVoices = await listTtsVoices();
      const filtered = lang
        ? allVoices.filter((v) => v.lang === lang)
        : allVoices;
      setVoices(filtered);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al cargar las voces';
      setError(message);
      setVoices([]);
    } finally {
      setIsLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    load();
  }, [load]);

  return { voices, isLoading, error, reload: load };
}
