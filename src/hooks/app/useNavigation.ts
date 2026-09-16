import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import type { AppView } from "../../types/app";
import { useGameStore } from "../../store/gameStore";

export interface UseNavigationReturn {
  view: AppView;
  navigate: (nextView: AppView) => void;
  goBack: () => void;
  isReturningToGame: boolean;
}

export function useNavigation(): UseNavigationReturn {
  const routerNavigate = useNavigate();
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
      routerNavigate(`/${nextView}`);
    },
    [view, clearListContext, routerNavigate],
  );

  const goBack = useCallback(() => {
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    const target = prev ?? "dashboard";
    if (target === "dashboard") {
      clearListContext();
    }
    setView(target);
    routerNavigate(`/${target}`);
  }, [clearListContext, routerNavigate]);

  const isReturningToGame =
    historyRef.current[historyRef.current.length - 1] === "game";

  return { view, navigate, goBack, isReturningToGame };
}