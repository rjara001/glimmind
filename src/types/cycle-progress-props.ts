import type { GameCycle, GameState } from '../types';
import type { CycleMiniStats } from './cycle-mini-bar-props';

export interface CycleProgressProps {
  gameState: GameState;
  cycleColorName?: string;
  isMobile?: boolean;
  learnedCountRef?: React.RefObject<HTMLSpanElement | HTMLDivElement | null>;
  cycleMiniStats?: CycleMiniStats;
}