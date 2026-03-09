
import { useEffect, useReducer, useState } from 'react';
import { AssociationList, GameState } from '../types';
import { GlimmindGame } from '../services/gameEngine';

// The initial state for the GlimmindGame class instance
const initialEngineState: GameState = {
    listId: '', associations: [], initialAssociations: [], currentCycle: 1, currentIndex: 0, queue: [],
    isFinished: false, revealed: false, wasRevealed: false, userInput: '',
    statusCounts: { DESCONOCIDA:{p:0,c:0}, DESCUBIERTA:{p:0,c:0}, RECONOCIDA:{p:0,c:0}, CONOCIDA:{p:0,c:0} },
    sessionStats: { newlyLearned: 0 },
};

// The reducer function remains the same, it just processes actions.
function gameReducer(state: GlimmindGame, action: { type: string; payload?: any }): GlimmindGame {
  return state.processAction(action);
}

interface GameLogicProps {
  list: AssociationList;
  onUpdateList: (list: AssociationList) => void;
}

export const useGameLogic = ({ list, onUpdateList }: GameLogicProps) => {
  
  const [game, dispatch] = useReducer(gameReducer, new GlimmindGame(initialEngineState));
  const [userInput, setUserInput] = useState('');
  const [revealed, setRevealed] = useState(false);

  // Effect to start the game, runs only once.
  useEffect(() => {
    dispatch({ type: 'START_GAME', payload: { list } });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [list]); // Depend on list to restart game if list changes

  // Effect to save game state changes.
  useEffect(() => {
    const currentState = game.currentState;
    // Guard clause: Do not update if the game is finished, not started, or the callback is missing.
    if (currentState.isFinished || !currentState.listId || !onUpdateList) return;

    const updatedList = {
        ...list,
        associations: currentState.associations,
    };
    onUpdateList(updatedList);
  // We must not include onUpdateList in deps to avoid loops if the parent doesn't use useCallback.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.currentState.associations]);

  const handlePass = () => {
    dispatch({ type: 'PASS' });
    setUserInput('');
    setRevealed(false);
  };

  const handleCorrect = () => {
    dispatch({ type: 'CORRECT' });
    setUserInput('');
    setRevealed(false);
  };

  const handleReveal = () => {
    setRevealed(true);
  };

  // handleNext is used after revealing an answer
  const handleNext = () => {
    // In this logic, revealing implies a 'pass' action for the game engine
    handlePass(); 
  };

  return {
    game,
    currentAssoc: game.currentAssoc,
    isFinished: game.currentState.isFinished,
    revealed,
    userInput,
    setUserInput,
    handlePass,
    handleCorrect,
    handleReveal,
    handleNext
  };
};
