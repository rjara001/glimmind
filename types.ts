
export type GameMode = 'training' | 'real';
export type GameCycle = 1 | 2 | 3 | 4;
export type GameFeedback = 'none' | 'correct' | 'incorrect';

export interface Association {
  id: string;
  term: string;
  definition: string;
  currentCycle: number;
  status: 'pending' | 'correct';
  isLearned: boolean;
  isArchived: boolean;
}

export interface AssociationList {
  id: string;
  userId: string;
  name: string;
  concept: string;
  associations: Association[];
  isArchived: boolean;
  settings: {
    mode: GameMode;
    flipOrder: 'normal' | 'reversed';
    threshold: number;
  };
  createdAt?: any; // Changed to any to support both number and FieldValue
  updatedAt?: any; // Changed to any to support both number and FieldValue
}

export interface GameSummary {
  learned: number;
  known: number;
  recognized: number;
  seen: number;
}

export interface GameState {
  listId: string;
  globalCycle: GameCycle;
  associations: Association[];
  activeQueue: string[];
  currentIndex: number;
  isFinished: boolean;
  summary: GameSummary | null;
  revealed: boolean;
  userInput: string;
  feedback: GameFeedback;
}
