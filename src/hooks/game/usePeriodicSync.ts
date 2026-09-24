import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getPeriodicIntervalMs } from '../../constants/syncConfig';

export function usePeriodicSync() {
  const { pendingDeltas, flushSync, user } = useGameStore();
  const tier = user?.uid === 'guest' ? 'free' : 'free'; // TODO: get actual tier from user

  useEffect(() => {
    if (!user || user.uid === 'guest') return;

    const intervalMs = getPeriodicIntervalMs(tier);
    const interval = setInterval(() => {
      pendingDeltas.forEach((deltas, listId) => {
        if (deltas.length > 0) {
          flushSync(listId).catch((error) => {
            console.error('[usePeriodicSync] flushSync failed:', error);
          });
        }
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [pendingDeltas, flushSync, user, tier]);
}