import { Association } from "../types";
import {
  StateBreakdown,
  DailyProgress,
  UserProgress,
  CelebrationEvent,
  RepasoContext,
  RepasoResult,
} from "../types/progress";

const DEFAULT_GOAL_TARGET = 30;
export const MILESTONE_THRESHOLDS = [10, 25, 50, 100];

export function todayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function yesterdayKey(from: Date = new Date()): string {
  const yesterday = new Date(from);
  yesterday.setDate(yesterday.getDate() - 1);
  return todayKey(yesterday);
}

export function emptyStateBreakdown(): StateBreakdown {
  return { nuevas: 0, vistas: 0, reconocidas: 0, conocidas: 0, aprendidas: 0 };
}

export function emptyDailyProgress(): DailyProgress {
  return { repasos: 0, byState: emptyStateBreakdown() };
}

/**
 * Returns the bucket a single association belongs to based on its cycle/learned state.
 */
export function stateOf(association: Association): keyof StateBreakdown {
  if (association.isLearned) return "aprendidas";
  switch (association.currentCycle) {
    case 4:
      return "conocidas";
    case 3:
      return "reconocidas";
    case 2:
      return "vistas";
    default:
      return "nuevas";
  }
}

/**
 * Computes the state distribution of a list's active (non-archived) associations.
 */
export function computeStateBreakdown(associations: Association[]): StateBreakdown {
  const breakdown = emptyStateBreakdown();
  for (const association of associations) {
    if (association.isArchived) continue;
    breakdown[stateOf(association)] += 1;
  }
  return breakdown;
}

export function mergeBreakdown(
  target: StateBreakdown,
  contribution: StateBreakdown,
): StateBreakdown {
  return {
    nuevas: target.nuevas + contribution.nuevas,
    vistas: target.vistas + contribution.vistas,
    reconocidas: target.reconocidas + contribution.reconocidas,
    conocidas: target.conocidas + contribution.conocidas,
    aprendidas: target.aprendidas + contribution.aprendidas,
  };
}

export function addContribution(
  target: StateBreakdown,
  state: keyof StateBreakdown,
): StateBreakdown {
  return { ...target, [state]: target[state] + 1 };
}

export function computeStreak(
  currentStreak: number,
  lastActiveDate: string | null,
  today: string,
): number {
  if (lastActiveDate === today) return Math.max(1, currentStreak);
  if (lastActiveDate === yesterdayKey(new Date(`${today}T12:00:00`))) {
    return currentStreak + 1;
  }
  return 1;
}

export function createDefaultProgress(): UserProgress {
  const today = todayKey();
  return {
    goalTarget: DEFAULT_GOAL_TARGET,
    goalProgress: 0,
    goalStartedAt: today,
    streak: 0,
    lastActiveDate: "",
    playedToday: [],
    log: {},
    milestones: {},
  };
}

/**
 * Returns the next milestone threshold not yet reached for the given learned
 * percentage, or null when every milestone has been reached.
 */
export function nextMilestoneThreshold(reached: number[], percent: number): number | null {
  const reachedSet = new Set(reached);
  return MILESTONE_THRESHOLDS.find((threshold) => threshold > percent && !reachedSet.has(threshold)) ?? null;
}

/**
 * Applies a single repaso to the progress state. Goal progress carries over
 * across days (an unfinished goal drags into the next day) while the played
 * dedupe set resets daily. Returns null when the association was already
 * played today.
 */
export function applyRepaso(
  progress: UserProgress,
  association: Association,
  listContext: RepasoContext | undefined,
  today: string,
): RepasoResult | null {
  let playedToday = progress.lastActiveDate === today ? progress.playedToday : [];
  if (playedToday.includes(association.id)) return null;

  playedToday = [...playedToday, association.id];
  const streak = computeStreak(progress.streak, progress.lastActiveDate, today);

  const daily = progress.log[today] || emptyDailyProgress();
  const state = stateOf(association);
  daily.repasos += 1;
  daily.byState = { ...daily.byState, [state]: daily.byState[state] + 1 };

  let goalProgress = progress.goalProgress + 1;
  let celebration: CelebrationEvent | null = null;
  if (goalProgress >= progress.goalTarget) {
    goalProgress = 0;
    celebration = {
      id: Date.now(),
      type: "goal",
      message: `¡Meta completada! ${progress.goalTarget} repasos`,
      subtitle: "Arranca una nueva meta igual.",
    };
  }

  const milestones: Record<string, number[]> = { ...progress.milestones };
  if (listContext && listContext.total > 0) {
    const percent = Math.round((listContext.learned / listContext.total) * 100);
    const reached = MILESTONE_THRESHOLDS.filter(
      (threshold) => percent >= threshold && !(milestones[listContext.listId] || []).includes(threshold),
    );
    if (reached.length > 0) {
      milestones[listContext.listId] = [...(milestones[listContext.listId] || []), ...reached];
      celebration = {
        id: Date.now(),
        type: "milestone",
        message: `¡${Math.max(...reached)}% dominado en esta lista!`,
        subtitle: `${listContext.learned} de ${listContext.total} palabras dominadas.`,
      };
    }
  }

  const nextProgress: UserProgress = {
    ...progress,
    streak,
    lastActiveDate: today,
    playedToday,
    goalProgress,
    log: { ...progress.log, [today]: daily },
    milestones,
  };

  return { progress: nextProgress, celebration };
}
