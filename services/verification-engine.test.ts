import { describe, it, expect } from 'vitest';
import { GlimmindGame } from './gameEngine';
import { AssociationList } from '../types';

const createTestList = (associations: { term: string; definition: string }[] = []): AssociationList => ({
  id: 'test-list-1',
  userId: 'test-user',
  name: 'Test List',
  concept: 'Term / Definition',
  isArchived: false,
  settings: {
    mode: 'real',
    flipOrder: 'normal',
    threshold: 0.95,
  },
  associations: associations.map((a, i) => ({
    id: `assoc-${i}`,
    term: a.term,
    definition: a.definition,
    currentCycle: 1,
    status: 'pending' as const,
    isLearned: false,
    isArchived: false,
  })),
});

describe('GlimmindGame Engine - Threshold Validation', () => {
  describe('checkAnswer with threshold', () => {
    it('should accept exact match answer', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      const game = GlimmindGame.create(list);
      
      const result = game.setUserInput('hola').checkAnswer();
      expect(result.state.feedback).toBe('correct');
      expect(result.state.similarity).toBe(100);
    });

    it('should reject answer below threshold (75% < 95%)', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      list.settings.threshold = 0.95;
      
      const game = GlimmindGame.create(list);
      
      // "hla" is ~75% similar to "hola", should be incorrect with 95% threshold
      const result = game.setUserInput('hla').checkAnswer();
      expect(result.state.feedback).toBe('incorrect');
    });

    it('should accept answer at exactly threshold (95%)', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      list.settings.threshold = 0.75;
      
      const game = GlimmindGame.create(list);
      
      // With 75% threshold, "hla" (75%) should be accepted
      const result = game.setUserInput('hla').checkAnswer();
      expect(result.state.feedback).toBe('correct');
    });

    it('should use threshold from list settings', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      list.settings.threshold = 0.50; // 50% threshold
      
      const game = GlimmindGame.create(list);
      
      // Even "hl" (~50%) should be accepted with 50% threshold
      const result = game.setUserInput('hl').checkAnswer();
      expect(result.state.feedback).toBe('correct');
    });

    it('should calculate and store similarity percentage', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      
      const game = GlimmindGame.create(list);
      
      const result = game.setUserInput('hla').checkAnswer();
      expect(result.state.similarity).toBe(75);
      expect(result.state.lastAttempt).toBe('hla');
    });

    it('should clear input after incorrect attempt', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      
      const game = GlimmindGame.create(list);
      
      const result = game.setUserInput('wrong').checkAnswer();
      expect(result.state.userInput).toBe('');
    });

    it('should not validate if card is already revealed', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      
      const game = GlimmindGame.create(list).reveal();
      const result = game.setUserInput('hola').checkAnswer();
      
      // Should return same state, not validate
      expect(result.state.revealed).toBe(true);
    });

    it('should handle empty input as incorrect', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      
      const game = GlimmindGame.create(list);
      const result = game.setUserInput('').checkAnswer();
      
      expect(result.state.feedback).toBe('incorrect');
    });

    it('should be case insensitive', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      
      const game = GlimmindGame.create(list);
      const result = game.setUserInput('HOLA').checkAnswer();
      
      expect(result.state.feedback).toBe('correct');
    });

    it('should trim whitespace from answers', () => {
      const list = createTestList([{ term: 'hello', definition: 'hola' }]);
      
      const game = GlimmindGame.create(list);
      const result = game.setUserInput('  hola  ').checkAnswer();
      
      expect(result.state.feedback).toBe('correct');
    });
  });
});

describe('GlimmindGame Engine - Ignore Articles', () => {
  const enableIgnoreArticles = (list: AssociationList) => {
    list.settings.ignoreArticles = true;
    return list;
  };

  it('accepts a missing article when ignoreArticles is enabled', () => {
    const list = enableIgnoreArticles(createTestList([{ term: 'house', definition: 'the house' }]));

    const result = GlimmindGame.create(list).setUserInput('house').checkAnswer();

    expect(result.state.feedback).toBe('correct');
    expect(result.state.similarity).toBe(100);
  });

  it('accepts an extra article when ignoreArticles is enabled', () => {
    const list = enableIgnoreArticles(createTestList([{ term: 'house', definition: 'house' }]));

    const result = GlimmindGame.create(list).setUserInput('the house').checkAnswer();

    expect(result.state.feedback).toBe('correct');
    expect(result.state.similarity).toBe(100);
  });

  it('ignores different articles between answer and expectation', () => {
    const list = enableIgnoreArticles(createTestList([{ term: 'big house', definition: 'a big house' }]));

    const result = GlimmindGame.create(list).setUserInput('the big house').checkAnswer();

    expect(result.state.feedback).toBe('correct');
  });

  it('ignores Spanish articles', () => {
    const list = enableIgnoreArticles(createTestList([{ term: 'house', definition: 'la casa' }]));

    const result = GlimmindGame.create(list).setUserInput('casa').checkAnswer();

    expect(result.state.feedback).toBe('correct');
  });

  it('ignores prepositions in both languages', () => {
    const list = enableIgnoreArticles(createTestList([{ term: 'run', definition: 'to run' }]));

    const result = GlimmindGame.create(list).setUserInput('run').checkAnswer();

    expect(result.state.feedback).toBe('correct');
  });

  it('rejects the same answer when ignoreArticles is off', () => {
    const list = createTestList([{ term: 'house', definition: 'the house' }]);

    const result = GlimmindGame.create(list).setUserInput('house').checkAnswer();

    expect(result.state.feedback).toBe('incorrect');
  });

  it('does not strip article-like substrings inside words', () => {
    const list = enableIgnoreArticles(createTestList([{ term: 'mother', definition: 'mother' }]));

    const result = GlimmindGame.create(list).setUserInput('the mother').checkAnswer();

    expect(result.state.feedback).toBe('correct');
    expect(result.state.similarity).toBe(100);
  });

  it('still rejects real differences when articles are ignored', () => {
    const list = enableIgnoreArticles(createTestList([{ term: 'mouse', definition: 'the mouse' }]));

    const result = GlimmindGame.create(list).setUserInput('the house').checkAnswer();

    expect(result.state.feedback).toBe('incorrect');
  });
});

describe('GlimmindGame Engine - Similarity Calculation', () => {
  it('should return 100% for identical strings', () => {
    const list = createTestList([{ term: 'test', definition: 'test' }]);
    const game = GlimmindGame.create(list);
    
    const result = game.setUserInput('test').checkAnswer();
    expect(result.state.similarity).toBe(100);
  });

  it('should return 0% for completely different strings', () => {
    const list = createTestList([{ term: 'a', definition: 'a' }]);
    const game = GlimmindGame.create(list);
    
    const result = game.setUserInput('zzzzz').checkAnswer();
    expect(result.state.similarity).toBe(0);
  });

  it('should calculate similarity for similar words', () => {
    const list = createTestList([{ term: 'hello', definition: 'hello' }]);
    const game = GlimmindGame.create(list);
    
    const result = game.setUserInput('helo').checkAnswer();
    expect(result.state.similarity).toBe(80);
  });

  it('should handle empty correct answer', () => {
    const list = createTestList([{ term: 'empty', definition: '' }]);
    const game = GlimmindGame.create(list);
    
    const result = game.setUserInput('').checkAnswer();
    expect(result.state.similarity).toBe(100);
  });
});

describe('GlimmindGame Engine - Game Flow', () => {
  it('should move to next card on CORRECT action', () => {
    const list = createTestList([
      { term: 'hello', definition: 'hola' },
      { term: 'world', definition: 'mundo' },
    ]);
    
    const game = GlimmindGame.create(list);
    const correctGame = game.setUserInput('hola').checkAnswer();
    const nextGame = correctGame.processAction({ type: 'CORRECT' });
    
    expect(nextGame.state.currentIndex).toBe(1);
  });

  it('should move to next card on PASS action', () => {
    const list = createTestList([
      { term: 'hello', definition: 'hola' },
      { term: 'world', definition: 'mundo' },
    ]);
    
    const game = GlimmindGame.create(list);
    const nextGame = game.processAction({ type: 'PASS' });
    
    expect(nextGame.state.currentIndex).toBe(1);
  });

  it('should increment cycle on PASS', () => {
    const list = createTestList([
      { term: 'hello', definition: 'hola' },
    ]);
    
    const game = GlimmindGame.create(list);
    const nextGame = game.processAction({ type: 'PASS' });
    
    const assoc = nextGame.state.associations.find(a => a.id === 'assoc-0');
    expect(assoc?.currentCycle).toBe(2);
  });

  it('should mark as learned on CORRECT in cycle 1', () => {
    const list = createTestList([
      { term: 'hello', definition: 'hola' },
    ]);
    
    const game = GlimmindGame.create(list);
    const correctGame = game.setUserInput('hola').checkAnswer();
    const nextGame = correctGame.processAction({ type: 'CORRECT' });
    
    const assoc = nextGame.state.associations.find(a => a.id === 'assoc-0');
    expect(assoc?.isLearned).toBe(true);
  });

  it('should end game when all cards are done', () => {
    const list = createTestList([
      { term: 'hello', definition: 'hola' },
    ]);
    
    const game = GlimmindGame.create(list);
    const correctGame = game.setUserInput('hola').checkAnswer();
    const finishedGame = correctGame.processAction({ type: 'CORRECT' });
    
    expect(finishedGame.state.isFinished).toBe(true);
    expect(finishedGame.state.summary).not.toBeNull();
  });

  it('should reveal card without validating', () => {
    const list = createTestList([{ term: 'hello', definition: 'hola' }]);
    
    const game = GlimmindGame.create(list);
    const revealedGame = game.reveal();
    
    expect(revealedGame.state.revealed).toBe(true);
  });

  it('should restart game', () => {
    const list = createTestList([{ term: 'hello', definition: 'hola' }]);
    
    const game = GlimmindGame.create(list);
    const correctGame = game.setUserInput('hola').checkAnswer();
    const finishedGame = correctGame.processAction({ type: 'CORRECT' });
    const restartedGame = finishedGame.restart();
    
    expect(restartedGame.state.currentIndex).toBe(0);
    expect(restartedGame.state.isFinished).toBe(false);
  });
});
