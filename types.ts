
export enum AssociationStatus {
  DESCONOCIDA = 'DESCONOCIDA',
  DESCUBIERTA = 'DESCUBIERTA',
  RECONOCIDA = 'RECONOCIDA',
  CONOCIDA = 'CONOCIDA',
  APRENDIDA = 'APRENDIDA'
}

export interface Association {
  id: string;
  term: string;
  definition: string;
  status: AssociationStatus;
  history?: boolean;
}

export type GameMode = 'training' | 'real';
export type FlipOrder = 'normal' | 'reversed';

export interface ListSettings {
  mode: GameMode;
  flipOrder: FlipOrder;
  threshold: number; // 0 to 1 (e.g., 0.95)
}

export interface AssociationList {
  id: string;
  userId: string;
  name: string;
  concept: string;
  associations: Association[];
  settings: ListSettings;
  createdAt: number;
}

export type GameCycle = 1 | 2 | 3 | 4 | 5;

export interface GameState {
  listId: string;
  currentCycle: GameCycle;
  currentIndex: number;
  queue: string[];
  history: string[];
  isFinished: boolean;
  revealed: boolean;
  userInput: string;
  lastMatchScore: number | null;
  wasRevealed: boolean;
}
