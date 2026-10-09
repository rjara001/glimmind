import { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { getPeriodicIntervalMs } from '../../constants/syncConfig';
import { GUEST_UID } from '../../constants/app';
import type { TierType } from '../../constants/syncConfig';

export function usePeriodicSync() {
  const { pendingDeltas, flushSync, user, quota } = useGameStore();
  const tier: TierType = quota?.tier === 'premium' ? 'premium' : 'free';

  useEffect(() => {
    if (!user || user.uid === GUEST_UID) return;

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