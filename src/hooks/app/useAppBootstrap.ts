import { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { auth, onAuthStateChanged } from '../../firebase';
import type { User } from 'firebase/auth';
import type { AppView } from '../../types/app';
import { GUEST_ID, LAST_PLAYED_KEY } from '../../constants/app';

export function useAppBootstrap(navigate: (view: AppView) => void) {
  const setUser = useGameStore((state) => state.setUser);
  const user = useGameStore((state) => state.user);
  const isLoaded = useGameStore((state) => state.isLoaded);

  const [lastPlayedId, setLastPlayedId] = useState<string | undefined>(() => {
    return localStorage.getItem(LAST_PLAYED_KEY) || undefined;
  });
  const didAutoNavigate = useRef(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        localStorage.removeItem('glimmind_guest_user');
        setUser(firebaseUser);
        return;
      }

      const savedGuest = localStorage.getItem('glimmind_guest_user');
      if (savedGuest) {
        try {
          const guest = JSON.parse(savedGuest);
          if (guest && guest.uid === GUEST_ID) {
            setUser(guest);
            return;
          }
        } catch {
          // Ignore corrupted guest data
        }
      }

      localStorage.removeItem('glimmind_guest_user');
      setUser(null);
    });
    return () => unsubscribe();
  }, [setUser]);

  useEffect(() => {
    useGameStore.getState().loadInitialData();
    useGameStore.getState().loadProgress();
    useGameStore.getState().loadQuota();
    useGameStore.getState().loadSettings();
  }, [user]);

  useEffect(() => {
    if (!isLoaded || !user || !lastPlayedId || didAutoNavigate.current) return;

    const { lists } = useGameStore.getState();
    const lastList = lists.find((l) => l.id === lastPlayedId);

    if (lastList) {
      useGameStore.getState().setCurrentList(lastPlayedId);
      didAutoNavigate.current = true;
      navigate('game');
    }
  }, [isLoaded, user, lastPlayedId, navigate]);

  return { lastPlayedId, setLastPlayedId };
}