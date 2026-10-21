import type { GameState } from '../types';
import type { CycleMiniStats } from './cycle-mini-bar-props';

export interface CycleProgressProps {
  gameState: GameState;
  cycleColorName?: string;
  learnedCountRef?: React.RefObject<HTMLSpanElement | null>;
  cycleMiniStats?: CycleMiniStats;
  isMobile?: boolean;
}