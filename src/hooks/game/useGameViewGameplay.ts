import { useCallback, useMemo, useEffect, useRef } from "react";
import { joinDefinitions, parseDefinitions } from "../../utils/normalizeAssociation";
import type { Association, AssociationList, Attempt, GameCycle, GameState } from "../../types";
import { useGameLogic } from "./useGameLogic";
import type { EffectType } from "../../effects/types";

const CYCLE_COLOR_MAP: Record<GameCycle, string> = {
  1: "sky",
  2: "yellow",
  3: "rose",
  4: "emerald",
};

function getCycleColorClass(colorName: string): string {
  switch (colorName) {
    case "sky":
      return "text-sky-600";
    case "yellow":
      return "text-yellow-600";
    case "rose":
      return "text-rose-600";
    case "emerald":
      return "text-emerald-600";
    default:
      return "text-slate-600";
  }
}

export interface UseGameViewGameplayArgs {
  list: AssociationList;
  gameState: GameState;
  currentAssociation: Association | undefined;
  feedback: "none" | "correct" | "incorrect";
  attempts: Attempt[];
  isEditingCard: boolean;
  isPracticeMode: boolean;
  actions: ReturnType<typeof useGameLogic>["actions"];
  onUpdateAssociations: (associations: Association[]) => Promise<void>;
  effectTrigger?: (type: EffectType, options?: any) => void;
}

export interface GameViewGameplay {
  isReversed: boolean;
  displayTerm: string;
  displayDef: string;
  labelTerm: string;
  labelDef: string;
  voiceTermLang?: string;
  voiceDefLang?: string;
  cycleStats: { pending: number; correct: number };
  cycleMiniStats: { cycle: GameCycle; pending: number; correct: number; total: number; isComplete: boolean };
  cycleColorName: string;
  cycleColorClass: string;
  cycle4Count: number;
  attemptCount: number;
  isTransitioning: boolean;
  isNearComplete: boolean;
  engineDisclaimer: string | undefined;
  engineFoundAnswers: string[] | undefined;
  handleCheckAnswer: () => void;
  handleUpdateExpectedAnswer: (
    associationId: string,
    field: "term" | "definition",
    value: string,
  ) => Promise<void>;
}

export function useGameViewGameplay({
  list,
  gameState,
  currentAssociation,
  feedback,
  attempts,
  isEditingCard,
  isPracticeMode,
  actions,
  onUpdateAssociations,
  effectTrigger,
}: UseGameViewGameplayArgs): GameViewGameplay {
  const isReversed = list.settings.flipOrder === "reversed";
  const remainingCount = gameState.remainingCount ?? 0;
  const prevFeedbackRef = useRef<typeof feedback>('none');
  const currentAssociationRef = useRef(currentAssociation);
  currentAssociationRef.current = currentAssociation;

  const displayTerm = currentAssociation
    ? isReversed
      ? joinDefinitions(currentAssociation.definition)
      : currentAssociation.term
    : "";
  const displayDef = currentAssociation
    ? isReversed
      ? currentAssociation.term
      : joinDefinitions(currentAssociation.definition)
    : "";

  const conceptParts = list.concept.split("/");
  const labelTerm = isReversed ? conceptParts[1] || "Definición" : conceptParts[0] || "Término";
  const labelDef = isReversed ? conceptParts[0] || "Término" : conceptParts[1] || "Definición";
  const voiceTermLang = isReversed ? list.settings.voiceDefLang : list.settings.voiceTermLang;
  const voiceDefLang = isReversed ? list.settings.voiceTermLang : list.settings.voiceDefLang;

  const correctCount = useMemo(
    () =>
      gameState.associations.filter((a) => a.status === "correct" || a.isLearned === true).length,
    [gameState.associations],
  );

  const cycleStats = {
    pending: gameState.activeQueue.length - gameState.currentIndex,
    correct: correctCount,
  };

  const cycleMiniStats = useMemo(() => {
    const cycle = gameState.globalCycle as GameCycle;
    const inCycle = gameState.associations.filter((a) => a.currentCycle === cycle);
    const correct = inCycle.filter(
      (a) => a.status === "correct" || a.isLearned === true,
    ).length;
    const total = inCycle.length;
    const pending = total - correct;
    return {
      cycle,
      pending,
      correct,
      total,
      isComplete: total > 0 && pending === 0,
    };
  }, [gameState.associations, gameState.globalCycle]);

  const cycleColorName = CYCLE_COLOR_MAP[gameState.globalCycle as GameCycle] || "slate";
  const cycleColorClass = getCycleColorClass(cycleColorName);
  const cycle4Count = gameState.associations.filter((a) => a.currentCycle === 4).length;
  const attemptCount = currentAssociation
    ? attempts.filter((a) => a.associationId === currentAssociation.id).length
    : 0;

  const isTransitioning = feedback === "correct" && remainingCount <= 0 && !isEditingCard;
  const isNearComplete = gameState.isNearComplete === true && !gameState.isFinished && !isPracticeMode;

  const foundAnswers = gameState.foundAnswers ?? [];
  const expectedCount = gameState.expectedCount ?? 0;
  const engineDisclaimer =
    expectedCount > 0 ? `${foundAnswers.length} / ${expectedCount} expected answers` : undefined;
  const engineFoundAnswers = foundAnswers.length > 0 ? foundAnswers : undefined;

  const handleCheckAnswer = useCallback(() => {
    actions.checkAnswer();
  }, [actions]);

  useEffect(() => {
    const prev = prevFeedbackRef.current;
    if (prev === 'none' && feedback === 'correct' && effectTrigger) {
      if (currentAssociationRef.current?.currentCycle === 1) {
        effectTrigger('aprendida' as EffectType, {
          intensity: 'intenso',
          message: '🎉 ¡Aprendida!',
        });
      } else {
        effectTrigger('pop' as EffectType, {
          intensity: 'sutil',
        });
      }
    } else if (prev === 'none' && feedback === 'incorrect' && effectTrigger) {
      effectTrigger('shake' as EffectType, {
        intensity: 'normal',
      });
    }
    prevFeedbackRef.current = feedback;
  }, [feedback, effectTrigger]);

  const handleUpdateExpectedAnswer = useCallback(
    async (associationId: string, field: "term" | "definition", value: string) => {
      const nextValue = field === "definition" ? parseDefinitions(value) : value;
      const updatedAssociations = gameState.associations.map((a) =>
        a.id === associationId ? { ...a, [field]: nextValue, updatedAt: Date.now() } : a,
      );
      await onUpdateAssociations(updatedAssociations);
    },
    [gameState.associations, onUpdateAssociations],
  );

  return {
    isReversed,
    displayTerm,
    displayDef,
    labelTerm,
    labelDef,
    voiceTermLang,
    voiceDefLang,
    cycleStats,
    cycleMiniStats,
    cycleColorName,
    cycleColorClass,
    cycle4Count,
    attemptCount,
    isTransitioning,
    isNearComplete,
    engineDisclaimer,
    engineFoundAnswers,
    handleCheckAnswer,
    handleUpdateExpectedAnswer,
  };
}