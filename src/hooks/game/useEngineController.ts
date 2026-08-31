import { useCallback, useEffect, useState } from 'react';
import {
  EngineCardInput,
  EngineCardState,
  EngineFeedback,
  EngineMode,
  EngineTurn,
} from '../../types/engine';
import {
  evaluateTurn,
  getInitialTurn,
  startCard,
} from '../../services/engineController';

export interface UseEngineControllerOptions {
  active: boolean;
  cardId?: string;
  key: string;
  definition: string[];
  mode: EngineMode;
}

interface EngineBundle {
  state: EngineCardState;
  turn: EngineTurn;
  input: EngineCardInput;
  evaluated: boolean;
  lastInput: string;
}

/**
 * React bridge for the bidirectional engine controller. Holds the per-card
 * state via useState and exposes evaluation actions. It never advances the
 * card on its own; the parent (GameView) is responsible for progression.
 */
export function useEngineController({
  active,
  cardId,
  key,
  definition,
  mode,
}: UseEngineControllerOptions) {
  const [bundle, setBundle] = useState<EngineBundle | null>(null);

  const definitionKey = definition.join('|');

  useEffect(() => {
    if (!active || !cardId || definition.length === 0) {
      setBundle(null);
      return;
    }
    const input: EngineCardInput = { cardId, key, definition };
    const state = startCard(input, mode);
    const turn = getInitialTurn(state);
    setBundle({ state, turn, input, evaluated: false, lastInput: '' });
  }, [active, cardId, key, mode, definitionKey, definition.length]);

  const isActive = bundle !== null;

  const evaluate = useCallback((rawInput: string) => {
    setBundle((prev) => {
      if (!prev) return prev;
      const result = evaluateTurn(prev.state, rawInput);
      return {
        state: result.state,
        turn: result.turn,
        input: prev.input,
        evaluated: true,
        lastInput: rawInput.trim(),
      };
    });
  }, []);

  const reset = useCallback(() => {
    setBundle((prev) => {
      if (!prev) return prev;
      const input = { ...prev.input };
      const state = startCard(input, prev.state.mode);
      const turn = getInitialTurn(state);
      return { state, turn, input, evaluated: false, lastInput: '' };
    });
  }, []);

  const feedback: EngineFeedback = !isActive
    ? 'none'
    : bundle.evaluated && bundle.turn.is_correct
      ? 'correct'
      : bundle.evaluated
        ? 'incorrect'
        : 'none';

  return {
    isActive,
    state: bundle?.state ?? null,
    turn: bundle?.turn ?? null,
    feedback,
    evaluated: bundle?.evaluated ?? false,
    lastInput: bundle?.lastInput ?? '',
    isCompleted: bundle?.state.isCompleted ?? false,
    disclaimer: bundle?.turn.disclaimer ?? '',
    evaluate,
    reset,
  };
}