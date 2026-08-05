
import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Association, AssociationList } from '../types';
import { GlimmindGame } from '../services/gameEngine';
import { useGameStore } from '../store/gameStore';

export const useGameLogic = ({ list, autoStart = false }: { list: AssociationList; autoStart?: boolean }) => {
  const [game, setGame] = useState(() => GlimmindGame.create(list));
  const [sessionRepasos, setSessionRepasos] = useState(0);
  const prevViewRef = useRef<'card' | 'summary'>('card');
  const autoStartAttempted = useRef(false);
  const gameRef = useRef(game);
  const sessionPlayedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    setGame(prev => prev.updateList(list));
  }, [list]);

  useEffect(() => {
    if (autoStart && !autoStartAttempted.current) {
      const currentView = game.state.isFinished ? 'summary' : 'card';
      if (currentView === 'summary') {
        autoStartAttempted.current = true;
        setGame(g => g.restart());
      }
    }
  }, [autoStart, game.state.isFinished]);

  const play = useCallback((association: Association | undefined) => {
    if (!association) return;
    if (!sessionPlayedIds.current.has(association.id)) {
      sessionPlayedIds.current.add(association.id);
      setSessionRepasos((n) => n + 1);
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

  const actions = useMemo(() => ({
    restart: (overrideList?: AssociationList) => setGame(prev => prev.restart(overrideList)),
    reveal: () => {
      play(gameRef.current.currentAssociation);
      setGame(prev => prev.reveal());
    },
    checkAnswer: () => {
      play(gameRef.current.currentAssociation);
      setGame(prev => prev.checkAnswer());
    },
    setUserInput: (input: string) => setGame(prev => prev.setUserInput(input)),
    handlePass: () => {
      play(gameRef.current.currentAssociation);
      setGame(prev => prev.processAction({ type: 'PASS' }));
    },
    handleCorrect: () => {
      play(gameRef.current.currentAssociation);
      setGame(prev => prev.processAction({ type: 'CORRECT' }));
    },
  }), [play]);

  const gameState = game.state;
  const currentAssociation = game.currentAssociation;

  const gameView = useMemo(() => {
    if (gameState.isFinished) return 'summary';
    return 'card';
  }, [gameState.isFinished]);

  useEffect(() => {
    prevViewRef.current = gameView;
  }, [gameView]);

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
  };
};
