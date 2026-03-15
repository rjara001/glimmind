
import { Association, AssociationList, GameState, GameCycle, GameSummary, GameFeedback } from "../types";

// The initial state for any new game, minus the list-specific parts.
const INITIAL_GAME_STATE: Omit<GameState, 'listId' | 'associations'> = {
  globalCycle: 1,
  activeQueue: [],
  currentIndex: 0,
  isFinished: false,
  summary: null,
  revealed: false,
  userInput: "",
  feedback: 'none',
};

/**
 * An immutable game engine for Glimmind.
 * Every action processed returns a NEW instance of the game
 * with the updated state, preserving the history of states.
 */
export class GlimmindGame {
  public readonly state: GameState;
  private readonly initialList: AssociationList;

  // The constructor is private to enforce creation through the static 'create' method,
  // ensuring a clear and single entry point for game initialization.
  private constructor(list: AssociationList, state: GameState) {
    this.initialList = list;
    this.state = state;
  }

  /**
   * Creates a new game instance from a list.
   * This is the official starting point for any game session.
   */
  public static create(list: AssociationList): GlimmindGame {
    const initialState = GlimmindGame._initializeGame(list);
    return new GlimmindGame(list, initialState);
  }

  public get currentAssociation(): Association | undefined {
    if (this.state.isFinished || !this.state.activeQueue[this.state.currentIndex]) {
      return undefined;
    }
    const currentId = this.state.activeQueue[this.state.currentIndex];
    return this.state.associations.find(a => a.id === currentId);
  }

  /** Restarts the game with the initial list, shuffling the cards again. */
  public restart(): GlimmindGame {
    const initialState = GlimmindGame._initializeGame(this.initialList);
    return new GlimmindGame(this.initialList, initialState);
  }

  /** Reveals the definition of the current card. */
  public reveal(): GlimmindGame {
    if (this.state.revealed) return this;
    return new GlimmindGame(this.initialList, { ...this.state, revealed: true });
  }

  /** Updates the user's input. */
  public setUserInput(input: string): GlimmindGame {
    return new GlimmindGame(this.initialList, { ...this.state, userInput: input, feedback: 'none' });
  }

  /** Checks the user's answer against the current card's definition. */
  public checkAnswer(): GlimmindGame {
    const current = this.currentAssociation;
    if (!current || this.state.revealed) return this;

    const isCorrect = this.state.userInput.trim().toLowerCase() === current.definition.trim().toLowerCase();
    const feedback: GameFeedback = isCorrect ? 'correct' : 'incorrect';

    if (isCorrect) {
      // If correct, we reveal and then process the 'CORRECT' action.
      const revealedState = { ...this.state, revealed: true, feedback };
      const revealedGame = new GlimmindGame(this.initialList, revealedState);
      return revealedGame.processAction({ type: 'CORRECT' });
    } else {
      // If incorrect, just show feedback and clear input.
      const incorrectState = { ...this.state, feedback, userInput: '' };
      return new GlimmindGame(this.initialList, incorrectState);
    }
  }

  /** Processes a 'CORRECT' or 'PASS' action on the current card. */
  public processAction(action: { type: 'CORRECT' | 'PASS' }): GlimmindGame {
    if (this.state.isFinished) return this; 

    const currentAssoc = this.currentAssociation;
    if (!currentAssoc) return this._checkForNextCycle();

    let associations = [...this.state.associations];
    const assocIndex = associations.findIndex(a => a.id === currentAssoc.id);

    if (action.type === 'CORRECT') {
      associations[assocIndex] = { ...currentAssoc, status: 'correct', isLearned: this.state.globalCycle === 1 ? true : currentAssoc.isLearned };
    } else if (action.type === 'PASS') {
      associations[assocIndex] = { ...currentAssoc, currentCycle: (currentAssoc.currentCycle + 1) as GameCycle };
    }

    const nextState: GameState = { ...this.state, associations, currentIndex: this.state.currentIndex + 1, revealed: false, userInput: '', feedback: 'none' };
    const nextGame = new GlimmindGame(this.initialList, nextState);
    return nextGame._checkForNextCycle();
  }

  // Checks if the current queue is finished and tries to generate the next one.
  private _checkForNextCycle(): GlimmindGame {
    if (this.state.currentIndex < this.state.activeQueue.length) return this; // The current queue is still active.

    const nextGlobalCycle = this.state.globalCycle + 1;
    if (nextGlobalCycle > 4) return this._endGame();

    const newQueue = GlimmindGame._generateActiveQueue(this.state.associations, nextGlobalCycle as GameCycle);
    if (newQueue.length === 0) return this._endGame();

    const nextState: GameState = { ...this.state, globalCycle: nextGlobalCycle as GameCycle, activeQueue: newQueue, currentIndex: 0 };
    return new GlimmindGame(this.initialList, nextState);
  }
  
  // Finalizes the game, calculating the summary.
  private _endGame(): GlimmindGame {
    const summary = GlimmindGame._calculateSummary(this.state.associations);
    const finalState: GameState = { ...this.state, isFinished: true, summary: summary };
    return new GlimmindGame(this.initialList, finalState);
  }

  // Calculates the final score summary. Static because it's a pure function.
  private static _calculateSummary(associations: Association[]): GameSummary {
    return associations.reduce((summary, assoc) => {
      if (assoc.isLearned) summary.learned++;
      else {
        switch (assoc.currentCycle) {
          case 4: case 5: summary.known++; break;
          case 3: summary.recognized++; break;
          case 2: summary.seen++; break;
        }
      }
      return summary;
    }, { learned: 0, known: 0, recognized: 0, seen: 0 });
  }
  
  // Prepares the initial state for the game. Static because it's a pure function.
  private static _initializeGame(list: AssociationList): GameState {
    const initialAssociations = list.associations
      .filter(a => !a.isArchived)
      .map(a => ({ ...a, currentCycle: 1, status: 'pending', isLearned: false } as Association));

    const shuffle = (arr: string[]) => arr.sort(() => Math.random() - 0.5);

    const activeQueue = GlimmindGame._generateActiveQueue(initialAssociations, 1);
    const shuffledQueue = shuffle(activeQueue);

    const state: GameState = { ...INITIAL_GAME_STATE, listId: list.id, associations: initialAssociations, activeQueue: shuffledQueue };
    
    if (state.activeQueue.length === 0) {
        state.isFinished = true;
        state.summary = GlimmindGame._calculateSummary(initialAssociations);
    }

    return state;
  }
  
  // Generates a new queue of card IDs for a given cycle. Static because it's a pure function.
  private static _generateActiveQueue(associations: Association[], cycle: GameCycle): string[] {
    return associations
      .filter(a => a.currentCycle === cycle && a.status === 'pending')
      .map(a => a.id);
  }
}
