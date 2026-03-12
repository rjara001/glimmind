// --- Core Game Types ---

/**
 * The status of an association for a given cycle.
 * - `pending`: Not yet answered correctly in the current globalCycle.
 * - `correct`: Answered correctly in a previous globalCycle.
 */
export type AssociationStatus = 'pending' | 'correct';

/**
 * Represents a global game cycle, from 1 to 4. The main loop of the game.
 */
export type GameCycle = 1 | 2 | 3 | 4;

/**
 * Represents the cycle an individual association is in. Can be 5 if passed on the final cycle.
 */
export type AssociationCycle = 1 | 2 | 3 | 4 | 5;

/**
 * Represents a single term-definition pair in a list.
 */
export interface Association {
  id: string;
  term: string;
  definition: string;

  /** The cycle this association belongs to. Incremented when 'passed'. */
  currentCycle: AssociationCycle;

  /** The overall status of this association, if it has been answered correctly. */
  status: AssociationStatus;

  /** Flag indicating if the association was answered correctly on the first try (in Cycle 1). */
  isLearned: boolean;
}

// --- List and Settings Types ---

export type GameMode = 'training' | 'real';
export type FlipOrder = 'normal' | 'reversed';

export interface ListSettings {
  mode: GameMode;
  flipOrder: FlipOrder;
  threshold: number;
}

export interface AssociationList {
  id: string;
  userId: string;
  name: string;
  concept: string;
  associations: Association[];
  settings: ListSettings;
  createdAt: number;
  updatedAt?: number;
}

// --- Game State & Stats Types ---

/**
 * Represents the summary of a completed game session.
 */
export interface GameSummary {
  totalLearned: number;
  reviewSuccess: number;
  forgottenPassed: number;
}

/**
 * Represents the overall state of the game engine for a session.
 */
export interface GameState {
  listId: string;
  associations: Association[];

  /** The current global cycle of the game (1-4). */
  globalCycle: GameCycle;

  /** The queue of association IDs for the current cycle. */
  activeQueue: string[];
  
  /** The index within the activeQueue. */
  currentIndex: number;

  isFinished: boolean;

  /** Summary stats, available when isFinished is true. */
  summary: GameSummary | null;
  
  // UI-related state, can be kept separate from core engine logic if preferred
  revealed: boolean;
  userInput: string;
}
