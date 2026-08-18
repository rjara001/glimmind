export interface StateBreakdown {
  nuevas: number;
  vistas: number;
  reconocidas: number;
  conocidas: number;
  aprendidas: number;
}

export interface DailyProgress {
  repasos: number;
  byState: StateBreakdown;
}

export interface UserProgress {
  goalTarget: number;
  goalProgress: number;
  goalStartedAt: string;
  streak: number;
  lastActiveDate: string;
  playedToday: string[];
  log: Record<string, DailyProgress>;
  milestones: Record<string, number[]>;
}

export interface CelebrationEvent {
  id: number;
  type: 'goal' | 'milestone';
  message: string;
  subtitle?: string;
}

export interface RepasoContext {
  listId: string;
  learned: number;
  total: number;
}

export interface RepasoResult {
  progress: UserProgress;
  celebration: CelebrationEvent | null;
}
