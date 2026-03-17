
import { useState, useMemo } from 'react';
import { AssociationList } from '../types';
import { GlimmindGame } from '../services/gameEngine';

export const useGameLogic = ({ list }: { list: AssociationList }) => {
  const [game, setGame] = useState(() => GlimmindGame.create(list));

  const actions = useMemo(() => ({
    restart: () => setGame(prev => prev.restart()),
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
