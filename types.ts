
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
  // Estado para persistir el progreso entre sesiones
  resumeState?: {
    cycle: GameCycle;
    queue: string[];
    index: number;
  };
}

export type GameCycle = 1 | 2 | 3 | 4;

export interface GameState {
  listId: string;
  currentCycle: GameCycle;
  currentIndex: number;
  queue: string[];
  isFinished: boolean;
  revealed: boolean;
  userInput: string;
  wasRevealed: boolean;
}
