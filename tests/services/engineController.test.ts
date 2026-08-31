import { describe, it, expect } from 'vitest';
import {
  buildTurn,
  evaluateTurn,
  getInitialTurn,
  startCard,
} from '@/services/engineController';
import { EngineCardState, EngineMode } from '@/types/engine';

const createState = (
  definition: string[],
  mode: EngineMode = 'DIRECT',
): EngineCardState =>
  startCard(
    { cardId: 'card-1', key: "I'm down", definition },
    mode,
  );

describe('startCard', () => {
  it('starts a DIRECT card with the Key as prompt and N expected answers', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);

    expect(state.mode).toBe('DIRECT');
    expect(state.promptWord).toBe("I'm down");
    expect(state.expectedCount).toBe(2);
    expect(state.remainingCount).toBe(2);
    expect(state.isCompleted).toBe(false);
    expect(state.foundAnswers).toEqual([]);
  });

  it('starts an INVERSE card with one Multivalor as prompt and 1 expected answer', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa'], 'INVERSE');

    expect(state.mode).toBe('INVERSE');
    expect(state.promptWord).toBe('Estoy de acuerdo');
    expect(state.expectedCount).toBe(1);
    expect(state.remainingCount).toBe(1);
  });

  it('deduplicates repeated multivalor renderings', () => {
    const state = createState(['Me copa', 'Me copa', 'me copa']);

    expect(state.expectedCount).toBe(1);
  });
});

describe('getInitialTurn', () => {
  it('emits the spec disclaimer 0 / N before the first evaluation', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);
    const turn = getInitialTurn(state);

    expect(turn.disclaimer).toBe('0 / 2 expected answers');
    expect(turn.is_correct).toBe(false);
    expect(turn.is_completed).toBe(false);
    expect(turn.remaining_count).toBe(2);
    expect(turn.found_answers).toEqual([]);
  });

  it('uses the spec JSON keys', () => {
    const state = createState(['Estoy de acuerdo']);
    const turn = getInitialTurn(state);

    expect(Object.keys(turn).sort()).toEqual([
      'card_id',
      'disclaimer',
      'found_answers',
      'is_completed',
      'is_correct',
      'mode',
      'prompt_word',
      'remaining_count',
      'system_message',
    ]);
  });
});

describe('evaluateTurn - DIRECT', () => {
  it('marks a correct answer, decrements remaining and updates the disclaimer', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);
    const { state: next, turn } = evaluateTurn(state, 'Estoy de acuerdo');

    expect(turn.is_correct).toBe(true);
    expect(turn.found_answers).toEqual(['Estoy de acuerdo']);
    expect(turn.remaining_count).toBe(1);
    expect(turn.disclaimer).toBe('1 / 2 expected answers');
    expect(turn.is_completed).toBe(false);
    expect(next.isCompleted).toBe(false);
  });

  it('is case, accent and punctuation insensitive', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);

    const { turn } = evaluateTurn(state, '¡ESTOY DE ACUERDO!');

    expect(turn.is_correct).toBe(true);
    expect(turn.found_answers).toEqual(['Estoy de acuerdo']);
  });

  it('accepts answers in any order', () => {
    let next = createState(['Estoy de acuerdo', 'Me copa']);
    let result = evaluateTurn(next, 'Me copa');
    next = result.state;
    result = evaluateTurn(next, 'Estoy de acuerdo');

    expect(result.turn.is_completed).toBe(true);
    expect(result.turn.remaining_count).toBe(0);
  });

  it('returns incorrect and keeps counters for a wrong answer', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);
    const { state: next, turn } = evaluateTurn(state, 'No sé');

    expect(turn.is_correct).toBe(false);
    expect(turn.remaining_count).toBe(2);
    expect(turn.system_message).toBe('Incorrect. Try again.');
    expect(next.remainingCount).toBe(2);
  });

  it('treats empty input as incorrect', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);
    const { turn } = evaluateTurn(state, '   ');

    expect(turn.is_correct).toBe(false);
  });

  it('does not double count a repeated answer', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);
    const first = evaluateTurn(state, 'Estoy de acuerdo');
    const second = evaluateTurn(first.state, 'estoy de acuerdo');

    expect(second.turn.is_correct).toBe(true);
    expect(second.turn.found_answers).toEqual(['Estoy de acuerdo']);
    expect(second.turn.remaining_count).toBe(1);
    expect(second.turn.system_message).toBe('Already found. Try another translation.');
  });

  it('completes the card when the last pending answer is found', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa']);
    const first = evaluateTurn(state, 'Estoy de acuerdo');
    const completed = evaluateTurn(first.state, 'Me copa');

    expect(completed.turn.is_completed).toBe(true);
    expect(completed.turn.remaining_count).toBe(0);
    expect(completed.turn.system_message).toBe(
      'Card completed! Move to the next card.',
    );
    expect(completed.state.isCompleted).toBe(true);
  });

  it('is a no-op with a completion message once the card is completed', () => {
    const state = createState(['Me copa']);
    const completed = evaluateTurn(state, 'Me copa');
    const again = evaluateTurn(completed.state, 'cualquier otra cosa');

    expect(again.turn.is_completed).toBe(true);
    expect(again.turn.system_message).toBe('Card completed! Move to the next card.');
    expect(again.state).toBe(completed.state);
  });
});

describe('evaluateTurn - INVERSE', () => {
  it('accepts the Key, which completes the 1:1 card', () => {
    const state = createState(['Estoy de acuerdo', 'Me copa'], 'INVERSE');
    const { state: next, turn } = evaluateTurn(state, "I'm down");

    expect(turn.is_correct).toBe(true);
    expect(turn.found_answers).toEqual(["I'm down"]);
    expect(turn.remaining_count).toBe(0);
    expect(turn.is_completed).toBe(true);
    expect(turn.disclaimer).toBe('1 / 1 expected answers');
    expect(next.isCompleted).toBe(true);
  });

  it('rejects a wrong Key and keeps remaining at 1', () => {
    const state = createState(['Me copa'], 'INVERSE');
    const { turn } = evaluateTurn(state, 'I am down');

    expect(turn.is_correct).toBe(false);
    expect(turn.remaining_count).toBe(1);
  });
});

describe('buildTurn', () => {
  it('renders a custom system message', () => {
    const state = createState(['Me copa']);
    const turn = buildTurn(state, {
      is_correct: false,
      system_message: 'Custom message',
    });

    expect(turn.system_message).toBe('Custom message');
    expect(turn.is_correct).toBe(false);
  });
});