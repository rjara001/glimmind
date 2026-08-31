export type EngineMode = 'DIRECT' | 'INVERSE';
export type EngineFeedback = 'none' | 'correct' | 'incorrect';

export interface EngineCardInput {
  cardId: string;
  key: string;
  definition: string[];
}

export interface EngineCardState {
  cardId: string;
  mode: EngineMode;
  promptWord: string;
  expectedCount: number;
  expectedAnswers: string[];
  foundAnswers: string[];
  remainingCount: number;
  isCompleted: boolean;
}

export interface EngineTurn {
  card_id: string;
  mode: EngineMode;
  prompt_word: string;
  disclaimer: string;
  is_correct: boolean;
  found_answers: string[];
  remaining_count: number;
  is_completed: boolean;
  system_message: string;
}

export interface EngineEvaluationResult {
  state: EngineCardState;
  turn: EngineTurn;
}