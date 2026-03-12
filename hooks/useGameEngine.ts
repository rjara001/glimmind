
import { useState, useMemo, useCallback } from 'react';
import { AssociationList, GameState } from '../types';
import { GlimmindGame } from '../services/gameEngine';
import { calculateSimilarity } from '../utils/similarity';

// This hook is a wrapper around the GlimmindGame class engine.
export const useGameEngine = (list: AssociationList) => {
  // The GlimmindGame class instance is the source of truth for all game logic.
  const [game, setGame] = useState(() => new GlimmindGame(list));

  // The hook's state is a direct reflection of the game engine's state.
  const [gameState, setGameState] = useState<GameState>(game.currentState);

  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');

  const updateStateFromEngine = useCallback((newGame: GlimmindGame) => {
    setGameState(newGame.currentState);
    setGame(newGame);
  }, []);

  const handleCorrect = useCallback(() => {
    const newGame = game.processAction({ type: 'CORRECT' });
    updateStateFromEngine(newGame);
  }, [game, updateStateFromEngine]);

  const handlePass = useCallback(() => {
    const newGame = game.processAction({ type: 'PASS' });
    updateStateFromEngine(newGame);
  }, [game, updateStateFromEngine]);

  const checkAnswer = useCallback(() => {
    const currentAssoc = game.currentAssociation;
    if (!currentAssoc || !gameState.userInput) return;

    const term = list.settings.flipOrder === 'reversed' ? currentAssoc.definition : currentAssoc.term;
    const definition = list.settings.flipOrder === 'reversed' ? currentAssoc.term : currentAssoc.definition;

    const similarity = calculateSimilarity(gameState.userInput, definition);
    const isCorrect = similarity >= (list.settings.threshold || 0.9);

    if (isCorrect) {
      setFeedback('correct');
      // Use a timeout to allow the user to see the feedback before advancing
      setTimeout(() => {
        handleCorrect();
        setFeedback('none');
      }, 600);
    } else {
      setFeedback('incorrect');
      // Reveal the correct answer, but don't advance automatically.
      setGameState(prevState => ({ ...prevState, revealed: true }));
    }
  }, [game, gameState.userInput, list.settings, handleCorrect]);

  const restart = useCallback(() => {
    const newGame = new GlimmindGame(list);
    setGame(newGame);
    setGameState(newGame.currentState);
  }, [list]);
  
  // Helper function to update the user's input
  const setUserInput = (input: string) => {
      setGameState(prevState => ({...prevState, userInput: input}));
  }

  const currentAssociation = useMemo(() => game.currentAssociation, [game]);

  return {
    gameState,
    currentAssociation,
    feedback,
    actions: {
      checkAnswer,
      handleCorrect,
      handlePass,
      restart,
      setUserInput,
      // Directly expose reveal for UI flexibility if needed
      reveal: () => setGameState(prevState => ({ ...prevState, revealed: true }))
    },
  };
};
