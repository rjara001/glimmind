
import { useState, useMemo, useCallback } from 'react';
import { AssociationList, GameState, GameFeedback } from '../types';
import { GlimmindGame } from '../services/gameEngine';

/**
 * This hook is the definitive controller connecting the React UI to the immutable GlimmindGame engine.
 * It holds the single source of truth—the `game` instance—and exposes its state and actions to the UI.
 */
export const useGameEngine = (list: AssociationList) => {
  // The `game` object is the one and only source of truth.
  // It's updated immutably by the actions below.
  const [game, setGame] = useState(() => GlimmindGame.create(list));

  // --- DERIVED STATE ---
  // These values are always in sync because they are derived directly from the current `game` instance.
  const gameState: GameState = game.state;
  const currentAssociation = useMemo(() => game.currentAssociation, [game]);
  // The feedback state is now derived directly from the game engine.
  const feedback: GameFeedback = gameState.feedback;

  // --- ACTIONS ---
  // All actions are wrapped in useCallback for performance.
  // They follow a simple pattern: call a method on the game engine, get a *new* game instance, and update the state.

  const handleCorrect = useCallback(() => {
    // We use a small delay after a correct answer to allow the user to see the feedback
    // before moving to the next card. The engine handles the state transition.
    setTimeout(() => setGame(g => g.processAction({ type: 'CORRECT' })), 600);
  }, []);

  const handlePass = useCallback(() => {
    setGame(g => g.processAction({ type: 'PASS' }));
  }, []);

  const restart = useCallback(() => {
    // The restart method on the instance resets the game state.
    setGame(g => g.restart());
  }, []);

  const reveal = useCallback(() => {
    setGame(g => g.reveal());
  }, []);

  const setUserInput = useCallback((input: string) => {
    setGame(g => g.setUserInput(input));
  }, []);

  const checkAnswer = useCallback(() => {
    setGame(g => g.checkAnswer());
  }, []);

  return {
    gameState,
    currentAssociation,
    feedback, // Now coming from the engine's state
    actions: {
      checkAnswer,
      handleCorrect,
      handlePass,
      restart,
      setUserInput,
      reveal,
    },
  };
};
