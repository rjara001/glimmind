import {
  EngineCardState,
  EngineEvaluationResult,
  EngineMode,
  EngineTurn,
} from "../types/engine";
import { normalizeAnswer } from "../utils/textNormalization";

const START_MESSAGE = "Enter the missing translation(s).";
const RETRY_MESSAGE = "Incorrect. Try again.";
const CORRECT_MESSAGE = "Correct! Keep going.";
const DUPLICATE_MESSAGE = "Already found. Try another translation.";
const COMPLETED_MESSAGE = "Card completed! Move to the next card.";

function dedupeAnswers(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = normalizeAnswer(value);
    if (normalized.length === 0 || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(value);
  }
  return result;
}

function buildDisclaimer(state: EngineCardState): string {
  return `${state.foundAnswers.length} / ${state.expectedCount} expected answers`;
}

/**
 * Builds the spec JSON turn payload for the current card state.
 */
export function buildTurn(
  state: EngineCardState,
  meta: { is_correct: boolean; system_message: string },
): EngineTurn {
  return {
    card_id: state.cardId,
    mode: state.mode,
    prompt_word: state.promptWord,
    disclaimer: buildDisclaimer(state),
    is_correct: meta.is_correct,
    found_answers: [...state.foundAnswers],
    remaining_count: state.remainingCount,
    is_completed: state.isCompleted,
    system_message: meta.system_message,
  };
}

/**
 * Initial turn shown when a card starts, before the first evaluation.
 */
export function getInitialTurn(state: EngineCardState): EngineTurn {
  return buildTurn(state, { is_correct: false, system_message: START_MESSAGE });
}

/**
 * Creates the starting state for a card.
 *
 * DIRECT: the Key is shown and every Multivalor must be discovered (N answers).
 * INVERSE: one Multivalor is shown and the Key must be discovered (N = 1).
 */
export function startCard(
  input: { cardId: string; key: string; definition: string[] },
  mode: EngineMode,
): EngineCardState {
  const key = input.key.trim();
  const definitions = dedupeAnswers(input.definition.map((value) => value.trim()));
  const isDirect = mode === 'DIRECT';
  const expectedAnswers = isDirect ? definitions : key ? [key] : [];
  const promptWord = isDirect ? key : definitions[0] ?? key;
  return {
    cardId: input.cardId,
    mode,
    promptWord,
    expectedCount: expectedAnswers.length,
    expectedAnswers,
    foundAnswers: [],
    remainingCount: expectedAnswers.length,
    isCompleted: expectedAnswers.length === 0,
  };
}

/**
 * Validates a raw user input against the current card state and returns the
 * next immutable state plus the spec turn payload.
 */
export function evaluateTurn(
  state: EngineCardState,
  rawInput: string,
): EngineEvaluationResult {
  if (state.isCompleted) {
    return {
      state,
      turn: buildTurn(state, { is_correct: false, system_message: COMPLETED_MESSAGE }),
    };
  }

  const normalizedInput = normalizeAnswer(rawInput);
  if (normalizedInput.length === 0) {
    return {
      state,
      turn: buildTurn(state, { is_correct: false, system_message: RETRY_MESSAGE }),
    };
  }

  const matchIndex = state.expectedAnswers.findIndex(
    (answer) => normalizeAnswer(answer) === normalizedInput,
  );
  if (matchIndex < 0) {
    return {
      state,
      turn: buildTurn(state, { is_correct: false, system_message: RETRY_MESSAGE }),
    };
  }

  const matchedAnswer = state.expectedAnswers[matchIndex];
  const alreadyFound = state.foundAnswers.some(
    (answer) => normalizeAnswer(answer) === normalizedInput,
  );
  if (alreadyFound) {
    return {
      state,
      turn: buildTurn(state, { is_correct: true, system_message: DUPLICATE_MESSAGE }),
    };
  }

  const foundAnswers = [...state.foundAnswers, matchedAnswer];
  const nextState: EngineCardState = {
    ...state,
    foundAnswers,
    remainingCount: state.expectedCount - foundAnswers.length,
    isCompleted: foundAnswers.length === state.expectedCount,
  };
  const message = nextState.isCompleted ? COMPLETED_MESSAGE : CORRECT_MESSAGE;
  return {
    state: nextState,
    turn: buildTurn(nextState, { is_correct: true, system_message: message }),
  };
}