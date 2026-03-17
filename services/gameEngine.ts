
import { Association, AssociationList, GameState, GameCycle, GameSummary } from "../types";

const INITIAL_GAME_STATE: Omit<GameState, 'listId' | 'associations'> = {
  globalCycle: 1,
  activeQueue: [],
  currentIndex: 0,
  isFinished: false,
  summary: null,
  revealed: false,
  userInput: "",
  feedback: 'none',
  similarity: null,
  lastAttempt: "",
  attempts: [],
};

/**
 * Calculates the Levenshtein distance between two strings. A lower number means more similar.
 */
function calculateLevenshteinDistance(a: string = '', b: string = ''): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) { matrix[0][i] = i; }
  for (let j = 0; j <= b.length; j += 1) { matrix[j][0] = j; }
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculates the similarity percentage between two strings.
 */
function calculateSimilarity(a: string, b: string): number {
  const distance = calculateLevenshteinDistance(a.toLowerCase(), b.toLowerCase());
  const longerLength = Math.max(a.length, b.length);
  if (longerLength === 0) return 100;
  const similarity = (1 - distance / longerLength) * 100;
  return Math.max(0, Math.round(similarity));
}

export class GlimmindGame {
  public readonly state: GameState;
  private readonly initialList: AssociationList;

  private constructor(list: AssociationList, state: GameState) {
    this.initialList = list;
    this.state = state;
  }

  public static create(list: AssociationList): GlimmindGame {
    const initialState = GlimmindGame._initializeGame(list);
    return new GlimmindGame(list, initialState);
  }

  public get currentAssociation(): Association | undefined {
    if (this.state.isFinished || !this.state.activeQueue[this.state.currentIndex]) return undefined;
    const currentId = this.state.activeQueue[this.state.currentIndex];
    return this.state.associations.find(a => a.id === currentId);
  }

  public restart(): GlimmindGame {
    const initialState = GlimmindGame._initializeGame(this.initialList);
    return new GlimmindGame(this.initialList, initialState);
  }

  public reveal(): GlimmindGame {
    if (this.state.revealed) return this;
    return new GlimmindGame(this.initialList, { ...this.state, revealed: true });
  }

  public setUserInput(input: string): GlimmindGame {
    const newState: GameState = { ...this.state, userInput: input, feedback: 'none', similarity: null };
    return new GlimmindGame(this.initialList, newState);
  }

  public checkAnswer(): GlimmindGame {
    const current = this.currentAssociation;
    if (!current || this.state.revealed) return this;

    const userAnswer = this.state.userInput.trim();
    const correctAnswer = current.definition.trim();
    const similarity = calculateSimilarity(userAnswer, correctAnswer);
    const threshold = this.initialList.settings.threshold * 100;
    const isCorrect = userAnswer.toLowerCase() === correctAnswer.toLowerCase() || similarity >= threshold;

    const newAttempt = {
      userInput: userAnswer,
      similarity,
      threshold,
      expectedAnswer: correctAnswer,
      timestamp: Date.now(),
    };

    const updatedAttempts = [...this.state.attempts, newAttempt];

    if (isCorrect) {
      const correctState: GameState = { ...this.state, revealed: true, feedback: 'correct', similarity: 100, lastAttempt: userAnswer, attempts: updatedAttempts };
      return new GlimmindGame(this.initialList, correctState);
    } else {
      const incorrectState: GameState = { ...this.state, feedback: 'incorrect', userInput: '', similarity, lastAttempt: userAnswer, attempts: updatedAttempts };
      return new GlimmindGame(this.initialList, incorrectState);
    }
  }

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

    const nextState: GameState = { ...this.state, associations, currentIndex: this.state.currentIndex + 1, revealed: false, userInput: '', feedback: 'none', similarity: null, lastAttempt: '' };
    const nextGame = new GlimmindGame(this.initialList, nextState);
    return nextGame._checkForNextCycle();
  }

  private _checkForNextCycle(): GlimmindGame {
    if (this.state.currentIndex < this.state.activeQueue.length) return this;
    const nextGlobalCycle = this.state.globalCycle + 1;
    if (nextGlobalCycle > 4) return this._endGame();

    const newQueue = GlimmindGame._generateActiveQueue(this.state.associations, nextGlobalCycle as GameCycle);
    if (newQueue.length === 0) return this._endGame();

    const nextState: GameState = { ...this.state, globalCycle: nextGlobalCycle as GameCycle, activeQueue: newQueue, currentIndex: 0 };
    return new GlimmindGame(this.initialList, nextState);
  }
  
  private _endGame(): GlimmindGame {
    const summary = GlimmindGame._calculateSummary(this.state.associations);
    const finalState: GameState = { ...this.state, isFinished: true, summary: summary };
    return new GlimmindGame(this.initialList, finalState);
  }

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
  
  private static _initializeGame(list: AssociationList): GameState {
    const initialAssociations = list.associations.filter(a => !a.isArchived).map(a => ({ ...a, currentCycle: 1, status: 'pending', isLearned: false } as Association));
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
  
  private static _generateActiveQueue(associations: Association[], cycle: GameCycle): string[] {
    return associations.filter(a => a.currentCycle === cycle && a.status === 'pending').map(a => a.id);
  }
}
