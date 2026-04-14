
import { useState, useMemo, useEffect, useRef } from 'react';
import { AssociationList } from '../types';
import { GlimmindGame } from '../services/gameEngine';

export const useGameLogic = ({ list, autoStart = false }: { list: AssociationList; autoStart?: boolean }) => {
  const [game, setGame] = useState(() => GlimmindGame.create(list));
  const prevViewRef = useRef<'card' | 'summary'>('card');
  const autoStartAttempted = useRef(false);

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

  const actions = useMemo(() => ({
    restart: (overrideList?: AssociationList) => setGame(prev => prev.restart(overrideList)),
    reveal: () => setGame(prev => prev.reveal()),
    checkAnswer: () => setGame(prev => prev.checkAnswer()),
    setUserInput: (input: string) => setGame(prev => prev.setUserInput(input)),
    handlePass: () => setGame(prev => prev.processAction({ type: 'PASS' })),
    handleCorrect: () => setGame(prev => prev.processAction({ type: 'CORRECT' })),
  }), []);

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
    actions,
  };
};
