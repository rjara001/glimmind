import { useCallback } from "react";
import type { Association, AssociationList, Attempt, GameState, GameSummary } from "../../types";
import { useGameStore } from "../../store/gameStore";
import type { GameViewState } from "./useGameViewState";

export interface UseGameViewActionsArgs {
  list: AssociationList;
  gameState: GameState;
  currentAssociation: Association | undefined;
  summary: GameSummary | null | undefined;
  sessionRepasos: number;
  actions: ReturnType<typeof import("./useGameLogic").useGameLogic>["actions"];
  practicePlayer: {
    pause: () => void;
    resume: () => void;
    stop: () => void;
    start: () => void;
  };
  voice: { stop: () => void };
  state: GameViewState;
  onBack: (updatedAssociations?: Association[]) => void;
  onUpdateAssociations: (associations: Association[]) => Promise<void>;
  onViewList?: (associationId?: string) => void;
}

export interface GameViewActions {
  handleStartEdit: () => void;
  handleCloseEdit: () => void;
  handleSaveEdit: (term: string, definition: string) => Promise<void>;
  handleDeleteCurrentCard: () => void;
  handleSelectAttempt: (attempt: Attempt) => void;
  handleCloseAttemptModal: () => void;
  handleToggleListening: () => void;
  handleStopVoice: () => void;
  handleEditDeck: () => void;
  handleArchiveLearnedCards: () => Promise<void>;
  handleFullRestart: () => Promise<void>;
  handleHeaderRestart: () => void;
  handleTogglePractice: () => void;
}

export function useGameViewActions({
  list,
  gameState,
  currentAssociation,
  summary,
  sessionRepasos,
  actions,
  practicePlayer,
  voice,
  state,
  onBack,
  onUpdateAssociations,
  onViewList,
}: UseGameViewActionsArgs): GameViewActions {
  const handleStartEdit = useCallback(() => {
    if (state.isPresentationMode) practicePlayer.pause();
    state.startEditingCard();
  }, [state, practicePlayer]);

  const handleCloseEdit = useCallback(() => {
    state.stopEditingCard();
    if (state.isPresentationMode) practicePlayer.resume();
  }, [state, practicePlayer]);

  const handleSaveEdit = useCallback(
    async (term: string, definition: string) => {
      const trimmedTerm = term.trim();
      const updatedAssociations = gameState.associations.map((a) =>
        a.id === currentAssociation?.id
          ? { ...a, term: trimmedTerm, definition: [definition.trim()], updatedAt: Date.now() }
          : a,
      );
      await onUpdateAssociations(updatedAssociations);
      actions.updateCurrentAssociation(trimmedTerm, [definition.trim()]);
      state.stopEditingCard();
      if (state.isPresentationMode) practicePlayer.resume();
    },
    [currentAssociation?.id, gameState.associations, onUpdateAssociations, state, practicePlayer, actions],
  );

  const handleDeleteCurrentCard = useCallback(() => {
    const associationId = currentAssociation?.id;
    if (!associationId) return;
    if (!confirm("Delete this card from the list?")) return;
    actions.deleteAssociation(associationId);
    state.stopEditingCard();
    if (state.isPresentationMode) practicePlayer.resume();
  }, [currentAssociation?.id, actions, state, practicePlayer]);

  const handleSelectAttempt = useCallback(
    (attempt: Attempt) => {
      state.setSelectedAttempt(attempt);
    },
    [state],
  );

  const handleCloseAttemptModal = useCallback(() => {
    state.setSelectedAttempt(null);
  }, [state]);

  const handleToggleListening = useCallback(() => {
    state.toggleVoiceActive();
  }, [state]);

  const handleStopVoice = useCallback(() => {
    voice.stop();
    state.setVoiceActive(false);
    state.setIsVoiceMode(false);
  }, [voice, state]);

  const handleEditDeck = useCallback(() => {
    useGameStore.getState().saveResumeState(list.id, {
      state: gameState,
      sessionRepasos,
    });
    onViewList?.(currentAssociation?.id);
  }, [list.id, gameState, sessionRepasos, onViewList, currentAssociation?.id]);

  const handleArchiveLearnedCards = useCallback(async () => {
    if (!summary || summary.learned === 0) {
      actions.restart();
      return;
    }
    const learnedCardIds = gameState.associations.filter((a) => a.isLearned).map((a) => a.id);
    if (learnedCardIds.length > 0) {
      const updatedAssociations = list.associations.map((assoc) => {
        if (learnedCardIds.includes(assoc.id)) {
          return {
            ...assoc,
            isArchived: true,
            isLearned: false,
            currentCycle: 1,
            status: "pending" as const,
          };
        }
        return assoc;
      });
      const updatedList = { ...list, associations: updatedAssociations };
      try {
        await onUpdateAssociations(updatedAssociations);
        const remainingToPlay = updatedAssociations.filter((a) => !a.isArchived).length;
        if (remainingToPlay === 0) {
          onBack(updatedAssociations);
        } else {
          actions.restart(updatedList);
        }
      } catch (error) {
        console.error("Error passing updated associations to parent:", error);
      }
    } else {
      actions.restart();
    }
  }, [summary, gameState.associations, list, onUpdateAssociations, onBack, actions]);

  const handleFullRestart = useCallback(async () => {
    const resetAssociations = list.associations.map((assoc) => ({
      ...assoc,
      isArchived: false,
      isLearned: false,
      currentCycle: 1,
      status: "pending" as const,
    }));
    const updatedList = { ...list, associations: resetAssociations };
    try {
      await onUpdateAssociations(resetAssociations);
      actions.restart(updatedList);
    } catch (error) {
      console.error("Error during full restart:", error);
    }
  }, [list, onUpdateAssociations, actions]);

  const handleHeaderRestart = useCallback(() => {
    if (confirm("Reset all progress for this list?")) {
      void handleFullRestart();
    }
  }, [handleFullRestart]);

  const handleTogglePractice = useCallback(() => {
    if (state.isPresentationMode) {
      practicePlayer.stop();
      state.setPresentationMode(false);
    } else {
      state.setPresentationMode(true);
      practicePlayer.start();
    }
  }, [state, practicePlayer]);

  return {
    handleStartEdit,
    handleCloseEdit,
    handleSaveEdit,
    handleDeleteCurrentCard,
    handleSelectAttempt,
    handleCloseAttemptModal,
    handleToggleListening,
    handleStopVoice,
    handleEditDeck,
    handleArchiveLearnedCards,
    handleFullRestart,
    handleHeaderRestart,
    handleTogglePractice,
  };
}
