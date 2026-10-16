import { useState, useEffect, useCallback } from 'react';
import { listTtsVoices } from '../../../services/voice/tts/chirpVoicesApi';
import { useGameStore } from '../../../store/gameStore';
import { GUEST_UID } from '../../../constants/app';
import { ChirpVoice } from '../../../types';

export function useChirpVoices(lang?: string) {
  const [voices, setVoices] = useState<ChirpVoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const user = useGameStore((state) => state.user);

  const load = useCallback(async () => {
    // AGENTS.md §31: guests operate strictly offline; they must never invoke
    // Cloud Functions. The voice catalog stays empty for them.
    if (!user || user.uid === GUEST_UID) {
      setVoices([]);
      setError(null);
      return;
    }
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
  }, [lang, user]);

  useEffect(() => {
    load();
  }, [load]);

  return { voices, isLoading, error, reload: load };
}
