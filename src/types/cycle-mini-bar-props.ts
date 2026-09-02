import type { GameCycle } from '../types';

export interface CycleMiniBarProps {
  cycle: GameCycle;
  pending: number;
  correct: number;
  total: number;
  isComplete?: boolean;
}

export interface CycleMiniStats {
  cycle: GameCycle;
  pending: number;
  correct: number;
  total: number;
  isComplete: boolean;
}
