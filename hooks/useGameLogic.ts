
import { useMemo } from 'react';
import { AssociationList } from '../types';
import { useGameEngine } from './useGameEngine';

interface GameLogicProps {
  list: AssociationList;
}

export type GameView = 'loading' | 'playing' | 'summary';

/**
 * A high-level hook to orchestrate the game flow.
 * It uses the `useGameEngine` to manage the core game logic and determines
 * which view (e.g., 'playing', 'summary') should be displayed.
 */
export const useGameLogic = ({ list }: GameLogicProps) => {
  const {
    gameState,
    currentAssociation,
    feedback,
    actions,
  } = useGameEngine(list);

  const gameView: GameView = useMemo(() => {
    if (gameState.isFinished) {
      return 'summary';
    }
    if (currentAssociation) {
      return 'playing';
    }
    // If the game is not finished but there is no current association,
    // it might be loading or in an intermediate state. 
    // Or the game ended immediately after starting.
    return gameState.isFinished ? 'summary' : 'loading';
  }, [gameState.isFinished, currentAssociation]);

  return {
    gameView,
    // Game State
    gameState,
    currentAssociation,
    summary: gameState.summary,
    
    // UI State
    feedback,
    userInput: gameState.userInput,
    isRevealed: gameState.revealed,

    // Actions
    actions,
  };
};
