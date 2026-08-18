import { describe, it, expect } from 'vitest';
import { Association } from '../types';
import {
  todayKey,
  yesterdayKey,
  emptyStateBreakdown,
  emptyDailyProgress,
  stateOf,
  computeStateBreakdown,
  mergeBreakdown,
  addContribution,
  computeStreak,
  createDefaultProgress,
  nextMilestoneThreshold,
  applyRepaso,
  MILESTONE_THRESHOLDS,
} from './progress';
import { UserProgress } from '../types/progress';

const createAssociation = (id: string, overrides: Partial<Association> = {}): Association => ({
  id,
  term: `Term ${id}`,
  definition: `Definition ${id}`,
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
  ...overrides,
});

describe('date keys', () => {
  it('formats today as YYYY-MM-DD', () => {
    const date = new Date(2026, 7, 5);
    expect(todayKey(date)).toBe('2026-08-05');
  });

  it('computes the previous day key', () => {
    const date = new Date(2026, 7, 5);
    expect(yesterdayKey(date)).toBe('2026-08-04');
  });
});

describe('state helpers', () => {
  it('returns an empty breakdown with all buckets at zero', () => {
    expect(emptyStateBreakdown()).toEqual({ nuevas: 0, vistas: 0, reconocidas: 0, conocidas: 0, aprendidas: 0 });
  });

  it('returns an empty daily progress entry', () => {
    expect(emptyDailyProgress()).toEqual({ repasos: 0, byState: { nuevas: 0, vistas: 0, reconocidas: 0, conocidas: 0, aprendidas: 0 } });
  });

  it('maps an association to its state bucket', () => {
    expect(stateOf(createAssociation('1'))).toBe('nuevas');
    expect(stateOf(createAssociation('2', { currentCycle: 2 }))).toBe('vistas');
    expect(stateOf(createAssociation('3', { currentCycle: 3 }))).toBe('reconocidas');
    expect(stateOf(createAssociation('4', { currentCycle: 4 }))).toBe('conocidas');
    expect(stateOf(createAssociation('5', { isLearned: true }))).toBe('aprendidas');
  });

  it('computes the state distribution of active associations', () => {
    const associations = [
      createAssociation('1'),
      createAssociation('2', { currentCycle: 2 }),
      createAssociation('3', { currentCycle: 3 }),
      createAssociation('4', { currentCycle: 4 }),
      createAssociation('5', { isLearned: true }),
      createAssociation('6', { isArchived: true }),
    ];

    expect(computeStateBreakdown(associations)).toEqual({
      nuevas: 1,
      vistas: 1,
      reconocidas: 1,
      conocidas: 1,
      aprendidas: 1,
    });
  });
});

describe('mergeBreakdown / addContribution', () => {
  it('merges two breakdowns by adding each bucket', () => {
    const target = { nuevas: 1, vistas: 2, reconocidas: 3, conocidas: 4, aprendidas: 5 };
    const contribution = { nuevas: 5, vistas: 4, reconocidas: 3, conocidas: 2, aprendidas: 1 };

    expect(mergeBreakdown(target, contribution)).toEqual({
      nuevas: 6,
      vistas: 6,
      reconocidas: 6,
      conocidas: 6,
      aprendidas: 6,
    });
  });

  it('adds a single contribution to one bucket without mutating the target', () => {
    const target = { nuevas: 1, vistas: 0, reconocidas: 0, conocidas: 0, aprendidas: 0 };

    const result = addContribution(target, 'vistas');

    expect(result).toEqual({ nuevas: 1, vistas: 1, reconocidas: 0, conocidas: 0, aprendidas: 0 });
    expect(target.vistas).toBe(0);
  });
});

describe('computeStreak', () => {
  it('keeps the streak when playing again the same day', () => {
    expect(computeStreak(5, '2026-08-05', '2026-08-05')).toBe(5);
  });

  it('grows the streak on a consecutive day', () => {
    expect(computeStreak(5, '2026-08-04', '2026-08-05')).toBe(6);
  });

  it('resets the streak after a gap', () => {
    expect(computeStreak(5, '2026-08-02', '2026-08-05')).toBe(1);
  });

  it('starts a streak of one when there is no previous activity', () => {
    expect(computeStreak(0, '', '2026-08-05')).toBe(1);
  });
});

describe('createDefaultProgress', () => {
  it('creates a fresh progress state with a 30 repasos goal', () => {
    const progress = createDefaultProgress();

    expect(progress.goalTarget).toBe(30);
    expect(progress.goalProgress).toBe(0);
    expect(progress.streak).toBe(0);
    expect(progress.playedToday).toEqual([]);
    expect(progress.log).toEqual({});
    expect(progress.milestones).toEqual({});
  });
});

describe('nextMilestoneThreshold', () => {
  it('returns the first threshold when nothing is reached', () => {
    expect(nextMilestoneThreshold([], 4)).toBe(10);
  });

  it('returns the next unreached threshold above the current percent', () => {
    expect(nextMilestoneThreshold([10, 25], 40)).toBe(50);
    expect(nextMilestoneThreshold([10, 25, 50], 55)).toBe(100);
  });

  it('returns null when every milestone has been reached', () => {
    expect(nextMilestoneThreshold(MILESTONE_THRESHOLDS, 100)).toBeNull();
  });
});

describe('applyRepaso', () => {
  it('returns null when the association was already played today', () => {
    const today = '2026-08-05';
    const progress: UserProgress = {
      ...createDefaultProgress(),
      lastActiveDate: today,
      playedToday: ['a'],
    };

    expect(applyRepaso(progress, createAssociation('a'), undefined, today)).toBeNull();
  });

  it('accumulates the repaso and buckets it by state', () => {
    const today = '2026-08-05';
    const progress = createDefaultProgress();

    const first = applyRepaso(progress, createAssociation('a', { currentCycle: 2 }), undefined, today);
    expect(first).not.toBeNull();
    expect(first!.progress.log[today].repasos).toBe(1);
    expect(first!.progress.log[today].byState.vistas).toBe(1);
    expect(first!.progress.playedToday).toEqual(['a']);

    const second = applyRepaso(first!.progress, createAssociation('b', { isLearned: true }), undefined, today);
    expect(second!.progress.log[today].repasos).toBe(2);
    expect(second!.progress.log[today].byState.aprendidas).toBe(1);
    expect(second!.progress.playedToday).toEqual(['a', 'b']);
  });

  it('completes the goal and triggers a celebration, then restarts the count', () => {
    const today = '2026-08-05';
    const progress: UserProgress = {
      ...createDefaultProgress(),
      goalTarget: 2,
      goalProgress: 1,
    };

    const result = applyRepaso(progress, createAssociation('a'), undefined, today);

    expect(result!.progress.goalProgress).toBe(0);
    expect(result!.celebration).toEqual({
      id: expect.any(Number),
      type: 'goal',
      message: '¡Meta completada! 2 repasos',
      subtitle: 'Arranca una nueva meta igual.',
    });
  });

  it('carries an unfinished goal over to the next day', () => {
    const today = '2026-08-05';
    const tomorrow = '2026-08-06';
    const progress: UserProgress = {
      ...createDefaultProgress(),
      goalTarget: 30,
      goalProgress: 12,
      streak: 5,
      lastActiveDate: today,
      playedToday: ['a', 'b'],
    };

    const result = applyRepaso(progress, createAssociation('c'), undefined, tomorrow);

    expect(result!.progress.goalProgress).toBe(13);
    expect(result!.progress.streak).toBe(6);
    expect(result!.progress.playedToday).toEqual(['c']);
  });

  it('records a milestone only when it is newly reached', () => {
    const today = '2026-08-05';
    const progress: UserProgress = {
      ...createDefaultProgress(),
      milestones: { list1: [10] },
    };
    const context = { listId: 'list1', learned: 5, total: 10 };

    const result = applyRepaso(progress, createAssociation('a'), context, today);

    expect(result!.progress.milestones.list1).toEqual([10, 25, 50]);
    expect(result!.celebration).toEqual({
      id: expect.any(Number),
      type: 'milestone',
      message: '¡50% dominado en esta lista!',
      subtitle: '5 de 10 palabras dominadas.',
    });
  });

  it('does not re-celebrate a milestone that was already reached', () => {
    const today = '2026-08-05';
    const progress: UserProgress = {
      ...createDefaultProgress(),
      milestones: { list1: [10, 25, 50] },
    };
    const context = { listId: 'list1', learned: 5, total: 10 };

    const result = applyRepaso(progress, createAssociation('a'), context, today);

    expect(result!.progress.milestones.list1).toEqual([10, 25, 50]);
    expect(result!.celebration).toBeNull();
  });

  it('ignores milestone logic when there is no list context', () => {
    const today = '2026-08-05';
    const progress = createDefaultProgress();

    const result = applyRepaso(progress, createAssociation('a'), undefined, today);

    expect(result!.progress.milestones).toEqual({});
    expect(result!.celebration).toBeNull();
  });
});
