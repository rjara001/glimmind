
import { describe, it, expect } from 'vitest';
import { GlimmindGame } from './gameEngine';

describe('GlimmindGame Robustness', () => {
  it('should not crash if settings are missing', () => {
    const list = {
      id: 'test-list',
      name: 'Test',
      concept: 'T/D',
      associations: [
        { id: '1', term: 'apple', definition: 'manzana', currentCycle: 1, status: 'pending', isLearned: false, isArchived: false }
      ],
      isArchived: false,
    } as any;

    expect(() => GlimmindGame.create(list)).not.toThrow();
    const game = GlimmindGame.create(list);

    // Should use default training mode and normal flip order
    const checkGame = game.setUserInput('manzana').checkAnswer();
    expect(checkGame.state.feedback).toBe('correct');
  });
});
