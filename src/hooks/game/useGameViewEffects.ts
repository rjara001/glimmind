import { useCallback, useEffect, useRef } from "react";
import type {
  Association,
  AssociationList,
  Attempt,
  GameState,
  VoiceCommandId,
} from "../../types";
import { joinDefinitions } from "../../utils/normalizeAssociation";
import { COMMAND_TOAST_MS } from "../../constants/voice";
import { useGameLogic } from "./useGameLogic";

export interface UseGameViewEffectsArgs {
  list: AssociationList;
  gameState: GameState;
  gameView: ReturnType<typeof useGameLogic>["gameView"];
  currentAssociationId: string | undefined;
  currentAssociationForToast: Association | undefined;
  isEditingCard: boolean;
  isPresentationMode: boolean;
  showSettings: boolean;
  feedback: "none" | "correct" | "incorrect";
  revealed: boolean;
  userInput: string;
  remainingCount: number;
  isFinished: boolean;
  attempts: Attempt[];
  lastAttempt: string;
  similarity: number | null | undefined;
  isReversed: boolean;
  detectedVoiceCommand: VoiceCommandId | undefined;
  onUpdateAssociations?: (associations: Association[]) => Promise<void>;
  onCountdownRunningChange: (running: boolean) => void;
  onPresentationModeChange: (active: boolean) => void;
  onAttemptToast: (message: string, kind: "success" | "error") => void;
  setDetectedVoiceCommand: (command: VoiceCommandId | undefined) => void;
  checkAnswer: () => void;
  handleCorrect: () => void;
  handlePass: () => void;
  reveal: () => void;
}

export function useGameViewEffects({
  list,
  gameState,
  gameView,
  currentAssociationId,
  isEditingCard,
  isPresentationMode,
  showSettings,
  feedback,
  revealed,
  userInput,
  remainingCount,
  isFinished,
  attempts,
  currentAssociationForToast,
  lastAttempt,
  similarity,
  isReversed,
  detectedVoiceCommand,
  onUpdateAssociations,
  onCountdownRunningChange,
  onPresentationModeChange,
  onAttemptToast,
  setDetectedVoiceCommand,
  checkAnswer,
  handleCorrect,
  handlePass,
  reveal,
}: UseGameViewEffectsArgs) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const nearCompleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (list.settings.mode === "training" || isPresentationMode || !currentAssociationId) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [currentAssociationId, list.settings.mode, isPresentationMode]);

  useEffect(() => {
    if (gameView === "summary") {
      onPresentationModeChange(false);
    }
  }, [gameView, onPresentationModeChange]);

  useEffect(() => {
    onCountdownRunningChange(
      Boolean(currentAssociationId) && revealed && !isFinished && !isEditingCard,
    );
  }, [currentAssociationId, revealed, isFinished, isEditingCard, onCountdownRunningChange]);

  useEffect(() => {
    if (!gameState.isNearComplete || isFinished || isEditingCard) {
      if (nearCompleteTimerRef.current) {
        clearTimeout(nearCompleteTimerRef.current);
        nearCompleteTimerRef.current = null;
      }
      return;
    }
    nearCompleteTimerRef.current = setTimeout(() => {
      nearCompleteTimerRef.current = null;
      if (!isFinished && !isEditingCard) {
        handleCorrect();
      }
    }, 10000);
    return () => {
      if (nearCompleteTimerRef.current) {
        clearTimeout(nearCompleteTimerRef.current);
        nearCompleteTimerRef.current = null;
      }
    };
  }, [gameState.isNearComplete, isFinished, isEditingCard, handleCorrect]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (showSettings || isEditingCard || isFinished || !currentAssociationId) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isTyping = isInput;

      if (feedback !== "none") {
        if (e.key === "Enter" && feedback === "correct" && remainingCount <= 0) {
          e.preventDefault();
          handleCorrect();
        }
        return;
      }

      if (list.settings.mode === "training") {
        if (!isTyping && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          if (!revealed) {
            reveal();
          } else {
            handlePass();
          }
        }
        return;
      }

      if (isTyping) {
        if (e.key === "Enter") {
          e.preventDefault();
          checkAnswer();
        }
      } else {
        if (e.key === " " && revealed) {
          e.preventDefault();
          handlePass();
        }
      }
    },
    [
      showSettings,
      isEditingCard,
      isFinished,
      currentAssociationId,
      feedback,
      list.settings.mode,
      revealed,
      checkAnswer,
      handleCorrect,
      handlePass,
      reveal,
      userInput,
      remainingCount,
    ],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (onUpdateAssociations && gameState.associations) {
      void onUpdateAssociations(gameState.associations);
    }
  }, [gameState.associations, onUpdateAssociations]);

  useEffect(() => {
    if (!currentAssociationForToast) return;
    const thresholdPercent = Math.round(list.settings.threshold * 100);
    const lastAttemptObj = attempts[attempts.length - 1];
    const expectedAnswer =
      lastAttemptObj?.expectedAnswer ??
      (isReversed
        ? currentAssociationForToast.term
        : joinDefinitions(currentAssociationForToast.definition));

    if (feedback === "correct") {
      onAttemptToast(
        `Correct! ${lastAttempt} → ${expectedAnswer} (${similarity}% similarity, needed ${thresholdPercent}%)`,
        "success",
      );
    } else if (feedback === "incorrect") {
      onAttemptToast(
        `Incorrect. You wrote: "${lastAttempt}" | Similarity: ${similarity}% | Needed: ${thresholdPercent}%`,
        "error",
      );
    }
  }, [
    feedback,
    currentAssociationForToast,
    onAttemptToast,
    list.settings.threshold,
    isReversed,
    lastAttempt,
    similarity,
    attempts,
  ]);

  useEffect(() => {
    if (!detectedVoiceCommand) return;
    const timer = setTimeout(() => setDetectedVoiceCommand(undefined), COMMAND_TOAST_MS);
    return () => clearTimeout(timer);
  }, [detectedVoiceCommand, setDetectedVoiceCommand]);

  return { inputRef, nearCompleteTimerRef, handleKeyDown };
}
