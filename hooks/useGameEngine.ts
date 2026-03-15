
import { useState, useMemo, useCallback } from 'react';
import { AssociationList, GameState } from '../types';
import { GlimmindGame } from '../services/gameEngine';
import { calculateSimilarity } from '../utils/similarity';

/**
 * This hook is the definitive controller connecting the React UI to the immutable GlimmindGame engine.
 * It holds the single source of truth—the `game` instance—and exposes its state and actions to the UI.
 */
export const useGameEngine = (list: AssociationList) => {
  // The `game` object is the one and only source of truth.
  // It's updated immutably by the actions below.
  const [game, setGame] = useState(() => GlimmindGame.create(list));

  // Transient UI state for feedback. This doesn't need to be in the core engine.
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');

  // --- DERIVED STATE ---
  // These values are always in sync because they are derived directly from the current `game` instance.
  const gameState: GameState = game.state;
  const currentAssociation = useMemo(() => game.currentAssociation, [game]);

  // --- ACTIONS ---
  // All actions are wrapped in useCallback for performance.
  // They follow a simple pattern: call a method on the game engine, get a *new* game instance, and update the state.

  const handleCorrect = useCallback(() => {
    setGame(g => g.processAction({ type: 'CORRECT' }));
  }, []);

  const handlePass = useCallback(() => {
    setGame(g => g.processAction({ type: 'PASS' }));
  }, []);

  const restart = useCallback(() => {
    setGame(GlimmindGame.create(list));
  }, [list]);

  const reveal = useCallback(() => {
    // In a pure immutable setup, even revealing is an action that produces a new state.
    // We will add this to the engine for purity, but for now, we handle it here.
    setGame(g => new GlimmindGame(list, { ...g.state, revealed: true }));
  }, [list]);

  const setUserInput = useCallback((input: string) => {
    setGame(g => new GlimmindGame(list, { ...g.state, userInput: input }));
  }, [list]);

  const checkAnswer = useCallback(() => {
    if (!currentAssociation || !gameState.userInput) return;

    const term = list.settings.flipOrder === 'reversed' ? currentAssociation.definition : currentAssociation.term;
    const definition = list.settings.flipOrder === 'reversed' ? currentAssociation.term : currentAssociation.definition;

    const similarity = calculateSimilarity(gameState.userInput, definition);
    const isCorrect = similarity >= (list.settings.threshold || 0.9);

    if (isCorrect) {
      setFeedback('correct');
      // After showing feedback, process the 'CORRECT' action.
      setTimeout(() => {
        setGame(g => g.processAction({ type: 'CORRECT' }));
        setFeedback('none');
      }, 600);
    } else {
      setFeedback('incorrect');
      // Only reveal the answer, don't advance.
      reveal();
    }
  }, [currentAssociation, gameState.userInput, list.settings, reveal]);

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
      reveal,
    },
  };
};
