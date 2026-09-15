import { useState, useCallback, useRef } from "react";
import type { AppView } from "../../types/app";
import { useGameStore } from "../../store/gameStore";

export interface UseNavigationReturn {
  view: AppView;
  navigate: (nextView: AppView) => void;
  goBack: () => void;
  isReturningToGame: boolean;
}

export function useNavigation(): UseNavigationReturn {
  const [view, setView] = useState<AppView>("dashboard");
  const historyRef = useRef<AppView[]>([]);

  const clearListContext = useCallback(() => {
    useGameStore.getState().setCurrentList(null);
    useGameStore.getState().clearAllResumeState();
  }, []);

  const navigate = useCallback(
    (nextView: AppView) => {
      if (nextView === "dashboard") {
        clearListContext();
        historyRef.current = [];
      } else {
        historyRef.current = [...historyRef.current, view];
      }
      setView(nextView);
    },
    [view, clearListContext]
  );

  const goBack = useCallback(() => {
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    const target = prev ?? "dashboard";
    if (target === "dashboard") {
      clearListContext();
    }
    setView(target);
  }, [clearListContext]);

  const isReturningToGame =
    historyRef.current[historyRef.current.length - 1] === "game";

  return { view, navigate, goBack, isReturningToGame };
}