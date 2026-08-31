
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Association, AssociationList } from '../../types';
import { GlimmindGame } from '../../services/gameEngine';
import { useGameStore } from '../../store/gameStore';
import { CardActivityEvent, GameSessionSummary } from '../../types/activity';
import { createActivityEvent, levelOf } from '../../utils/activity';
import { computeStateBreakdown } from '../../utils/progress';

const DEFAULT_AUTO_REVEAL_SECONDS = 15;
const DEFAULT_AUTO_ADVANCE_ATTEMPTS = 3;

export const useGameLogic = ({ list }: { list: AssociationList }) => {
  const trackingEnabled = useGameStore((state) => state.settings.activityHistoryEnabled);
  const [game, setGame] = useState(() => {
    const snapshot = useGameStore.getState().resumeState[list.id];
    if (snapshot) {
      const restored = GlimmindGame.restore(list, snapshot.state, { trackingEnabled });
      useGameStore.getState().clearResumeState(list.id);
      return restored;
    }
    return GlimmindGame.create(list, { trackingEnabled });
  });
  const [sessionRepasos, setSessionRepasos] = useState(() => {
    const snapshot = useGameStore.getState().resumeState[list.id];
    return snapshot?.sessionRepasos ?? 0;
  });
  const prevViewRef = useRef<'card' | 'summary'>('card');
  const gameRef = useRef(game);
  const sessionPlayedIds = useRef<Set<string>>(new Set());
  const sessionIdRef = useRef('');
  const sessionStartedAtRef = useRef(0);
  const sessionCardsPlayedRef = useRef(0);
  const sessionCorrectRef = useRef(0);
  const sessionIncorrectRef = useRef(0);
  const autoRevealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentAssociationIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!sessionIdRef.current) {
      sessionIdRef.current = crypto.randomUUID();
      sessionStartedAtRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    setGame(prev => prev.updateList(list));
  }, [list]);

  const gameState = game.state;
  const currentAssociation = game.currentAssociation;

  const autoRevealSeconds = list.settings.autoRevealAfterSeconds ?? DEFAULT_AUTO_REVEAL_SECONDS;
  const autoAdvanceAttempts = list.settings.autoAdvanceAfterAttempts ?? DEFAULT_AUTO_ADVANCE_ATTEMPTS;

  const clearAutoRevealTimer = useCallback(() => {
    if (autoRevealTimerRef.current) {
      clearTimeout(autoRevealTimerRef.current);
      autoRevealTimerRef.current = null;
    }
  }, []);

  const clearAutoAdvanceTimer = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
  }, []);

  const play = useCallback((association: Association | undefined) => {
    if (!association) return;
    if (!sessionPlayedIds.current.has(association.id)) {
      sessionPlayedIds.current.add(association.id);
      setSessionRepasos((n) => n + 1);
      sessionCardsPlayedRef.current += 1;
    }
    const state = gameRef.current.state;
    const active = state.associations.filter(a => !a.isArchived);
    const learned = active.filter(a => a.isLearned).length;
    useGameStore.getState().recordRepaso(association, {
      listId: state.listId,
      learned,
      total: active.length,
    });
  }, []);

  const emitRevealEvent = useCallback((before: GlimmindGame) => {
    const association = before.currentAssociation;
    if (!association) return;
    const userId = useGameStore.getState().user?.uid || '';
    useGameStore.getState().recordActivity([
      createActivityEvent({
        userId,
        listId: before.state.listId,
        cardId: association.id,
        cardTerm: association.term,
        sessionId: sessionIdRef.current,
        type: 'card_revealed',
      }),
    ]);
  }, []);

  const emitAnswerEvents = useCallback((before: GlimmindGame, after: GlimmindGame, correct: boolean) => {
    const association = before.currentAssociation;
    if (!association) return;
    const userId = useGameStore.getState().user?.uid || '';
    const afterAssoc = after.state.associations.find((a) => a.id === association.id);
    const base = {
      userId,
      listId: before.state.listId,
      cardId: association.id,
      cardTerm: association.term,
      sessionId: sessionIdRef.current,
    };
    const events: CardActivityEvent[] = [
      createActivityEvent({ ...base, type: 'card_answered', correct }),
    ];
    if (afterAssoc) {
      const fromLevel = levelOf(association);
      const toLevel = levelOf(afterAssoc);
      if (fromLevel !== toLevel) {
        events.push(
          createActivityEvent({ ...base, type: 'card_level_up', fromLevel, toLevel }),
        );
      }
    }
    if (correct) {
      sessionCorrectRef.current += 1;
    } else {
      sessionIncorrectRef.current += 1;
    }
    useGameStore.getState().recordActivity(events);
  }, []);

  useEffect(() => {
    clearAutoRevealTimer();
    clearAutoAdvanceTimer();
    currentAssociationIdRef.current = currentAssociation?.id;
  }, [currentAssociation?.id, clearAutoRevealTimer, clearAutoAdvanceTimer]);

  useEffect(() => {
    if (gameState.isFinished || gameState.revealed || gameState.feedback !== 'incorrect') {
      clearAutoRevealTimer();
      return;
    }
    if (autoRevealSeconds <= 0) return;
    autoRevealTimerRef.current = setTimeout(() => {
      autoRevealTimerRef.current = null;
      const before = gameRef.current;
      if (!before.state.revealed && before.state.feedback === 'incorrect') {
        emitRevealEvent(before);
        setGame(prev => prev.reveal());
      }
    }, autoRevealSeconds * 1000);
    return () => clearAutoRevealTimer();
  }, [gameState.feedback, gameState.revealed, gameState.isFinished, autoRevealSeconds, clearAutoRevealTimer, emitRevealEvent]);

  useEffect(() => {
    if (gameState.isFinished || gameState.revealed || gameState.feedback !== 'incorrect') {
      clearAutoAdvanceTimer();
      return;
    }
    if (autoAdvanceAttempts <= 0) return;
    const currentAssocId = currentAssociation?.id;
    if (!currentAssocId) return;
    const attemptsForCard = gameState.attempts.filter((a) => a.associationId === currentAssocId);
    if (attemptsForCard.length >= autoAdvanceAttempts) {
      autoAdvanceTimerRef.current = setTimeout(() => {
        autoAdvanceTimerRef.current = null;
        const before = gameRef.current;
        if (!before.state.revealed && before.state.feedback !== 'correct') {
          const after = before.processAction({ type: 'PASS' });
          emitAnswerEvents(before, after, false);
          setGame(after);
        }
      }, 1000);
    }
    return () => clearAutoAdvanceTimer();
  }, [gameState.attempts, gameState.feedback, gameState.revealed, gameState.isFinished, currentAssociation?.id, autoAdvanceAttempts, clearAutoAdvanceTimer, emitAnswerEvents]);

  const actions = useMemo(() => ({
    restart: (overrideList?: AssociationList) => {
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();
      sessionIdRef.current = crypto.randomUUID();
      sessionStartedAtRef.current = Date.now();
      sessionCardsPlayedRef.current = 0;
      sessionCorrectRef.current = 0;
      sessionIncorrectRef.current = 0;
      sessionPlayedIds.current.clear();
      setSessionRepasos(0);
      setGame(prev => prev.restart(overrideList));
    },
    reveal: () => {
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();
      play(gameRef.current.currentAssociation);
      const before = gameRef.current;
      emitRevealEvent(before);
      setGame(prev => prev.reveal());
    },
    checkAnswer: () => {
      play(gameRef.current.currentAssociation);
      const before = gameRef.current;
      const after = before.checkAnswer();
      emitAnswerEvents(before, after, after.state.feedback === 'correct');
      setGame(after);
    },
    setUserInput: (input: string) => setGame(prev => prev.setUserInput(input)),
    handlePass: () => {
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();
      play(gameRef.current.currentAssociation);
      const before = gameRef.current;
      const after = before.processAction({ type: 'PASS' });
      emitAnswerEvents(before, after, false);
      setGame(after);
    },
    handleCorrect: () => {
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();
      play(gameRef.current.currentAssociation);
      const before = gameRef.current;
      const after = before.processAction({ type: 'CORRECT' });
      emitAnswerEvents(before, after, true);
      setGame(after);
    },
    submitVoice: (text: string) => {
      const before = gameRef.current;
      const withInput = before.setUserInput(text);
      const after = withInput.checkAnswer();
      emitAnswerEvents(withInput, after, after.state.feedback === 'correct');
      setGame(after);
    },
    updateCurrentAssociation: (term: string, definition: string[]) => {
      const after = gameRef.current.updateCurrentAssociation(term, definition);
      setGame(after);
    },
    deleteAssociation: (associationId: string) => {
      setGame(prev => prev.removeAssociation(associationId));
    },
    goBack: () => {
      clearAutoRevealTimer();
      clearAutoAdvanceTimer();
      const before = gameRef.current;
      const after = before.goBack();
      if (after !== before) {
        setGame(after);
      }
    },
  }), [play, emitRevealEvent, emitAnswerEvents, clearAutoRevealTimer, clearAutoAdvanceTimer]);

  const gameView = useMemo(() => {
    if (gameState.isFinished) return 'summary';
    return 'card';
  }, [gameState.isFinished]);

  useEffect(() => {
    const reachedSummary = gameView === 'summary';
    const wasOnCard = prevViewRef.current === 'card';
    if (reachedSummary && wasOnCard && trackingEnabled && sessionCardsPlayedRef.current > 0) {
      const summary = gameState.summary;
      if (summary) {
        const session: GameSessionSummary = {
          id: sessionIdRef.current,
          listId: list.id,
          listName: list.name,
          startedAt: sessionStartedAtRef.current,
          endedAt: Date.now(),
          cardsPlayed: sessionCardsPlayedRef.current,
          correct: sessionCorrectRef.current,
          incorrect: sessionIncorrectRef.current,
          byLevel: computeStateBreakdown(gameState.associations),
        };
        useGameStore.getState().saveGameSession(session);
      }
    }
    prevViewRef.current = gameView;
  }, [gameView, trackingEnabled, list, gameState]);

  return {
    gameView,
    gameState,
    currentAssociation,
    summary: gameState.summary,
    feedback: gameState.feedback,
    userInput: gameState.userInput,
    isRevealed: gameState.revealed,
    similarity: gameState.similarity,
    lastAttempt: gameState.lastAttempt,
    attempts: gameState.attempts,
    sessionRepasos,
    actions,
    submitVoice: actions.submitVoice,
    autoRevealAfterSeconds: autoRevealSeconds,
    autoAdvanceAfterAttempts: autoAdvanceAttempts,
  };
};
