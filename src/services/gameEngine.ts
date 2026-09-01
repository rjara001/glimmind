import {
  Association,
  AssociationList,
  GameState,
  GameCycle,
  GameSummary,
  EngineMode,
} from "../types";
import { normalizeAnswer } from "../utils/textNormalization";

const INITIAL_GAME_STATE: Omit<GameState, "listId" | "associations"> = {
  globalCycle: 1,
  activeQueue: [],
  currentIndex: 0,
  isFinished: false,
  summary: null,
  revealed: false,
  userInput: "",
  feedback: "none",
  similarity: null,
  lastAttempt: "",
  attempts: [],
  revealedAssociations: [],
};

export interface GameOptions {
  /**
   * When false, the engine skips updating the lifetime tracking counters
   * (hits/misses/timesPlayed/lastPlayedAt). Used to honor the global
   * "activity history" setting, which is disabled by default.
   */
  trackingEnabled?: boolean;
}

/**
 * Calculates the Levenshtein distance between two strings. A lower number means more similar.
 */
function calculateLevenshteinDistance(a: string = "", b: string = ""): number {
  const matrix = Array(b.length + 1)
    .fill(null)
    .map(() => Array(a.length + 1).fill(null));
  for (let i = 0; i <= a.length; i += 1) {
    matrix[0][i] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[j][0] = j;
  }
  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculates the similarity percentage between two strings.
 */
function calculateSimilarity(a: string, b: string, ignoreArticles: boolean): number {
  const aNormalized = normalizeAnswer(a.trim(), ignoreArticles);
  const bNormalized = normalizeAnswer(b.trim(), ignoreArticles);

  if (aNormalized === bNormalized) return 100;

  const distance = calculateLevenshteinDistance(aNormalized, bNormalized);
  const longerLength = Math.max(aNormalized.length, bNormalized.length);
  if (longerLength === 0) return 100;
  const similarity = (1 - distance / longerLength) * 100;
  return Math.max(0, Math.round(similarity));
}

export class GlimmindGame {
  public readonly state: GameState;
  private readonly initialList: AssociationList;
  private readonly trackingEnabled: boolean;

  private constructor(list: AssociationList, state: GameState, trackingEnabled: boolean) {
    this.initialList = list;
    this.state = state;
    this.trackingEnabled = trackingEnabled;
  }

  public static create(list: AssociationList, options: GameOptions = {}): GlimmindGame {
    const trackingEnabled = options.trackingEnabled !== false;
    const initialState = GlimmindGame._initializeGame(list);
    return new GlimmindGame(list, initialState, trackingEnabled);
  }

  /**
   * Rebuilds a game from a previously saved snapshot while keeping it
   * consistent with the (possibly edited) list.
   *
   * Associations are re-hydrated from `list` so cards reflect the latest
   * term/definition values, but game progress (cycles, hits, misses,
   * status) is preserved by id. The active queue is filtered against the
   * current list and currentIndex is adjusted if the active card vanished.
   */
  public static restore(list: AssociationList, savedState: GameState, options: GameOptions = {}): GlimmindGame {
    const trackingEnabled = options.trackingEnabled !== false;

    const listById = new Map(list.associations.map((a) => [a.id, a]));
    const progressById = new Map(savedState.associations.map((a) => [a.id, a]));

    const associations = list.associations.map((current) => {
      const prev = progressById.get(current.id);
      if (!prev) return current;
      return {
        ...current,
        currentCycle: prev.currentCycle,
        status: prev.status,
        isLearned: prev.isLearned,
        hits: prev.hits ?? 0,
        misses: prev.misses ?? 0,
        timesPlayed: prev.timesPlayed ?? 0,
        lastPlayedAt: prev.lastPlayedAt,
      } as Association;
    });

    const validQueue = savedState.activeQueue.filter((id) => {
      const assoc = listById.get(id);
      return (
        assoc !== undefined &&
        !assoc.isArchived &&
        !assoc.isLearned &&
        assoc.status !== "correct"
      );
    });

    const currentId = savedState.activeQueue[savedState.currentIndex];
    const normalizedIndex = validQueue.indexOf(currentId);
    const currentIndex = normalizedIndex === -1 ? 0 : normalizedIndex;

    const associationIds = new Set(associations.map((a) => a.id));
    const revealedAssociations = savedState.revealedAssociations.filter((id) => associationIds.has(id));
    const attempts = savedState.attempts.filter((a) => associationIds.has(a.associationId));

    const refreshedState: GameState = {
      listId: list.id,
      globalCycle: savedState.globalCycle,
      associations,
      activeQueue: validQueue,
      currentIndex,
      isFinished: savedState.isFinished,
      summary: savedState.summary,
      revealed: savedState.revealed,
      userInput: savedState.userInput,
      feedback: savedState.feedback,
      similarity: savedState.similarity,
      lastAttempt: savedState.lastAttempt,
      attempts,
      revealedAssociations,
    };

    return new GlimmindGame(list, refreshedState, trackingEnabled);
  }

  public get currentAssociation(): Association | undefined {
    if (
      this.state.isFinished ||
      !this.state.activeQueue[this.state.currentIndex]
    )
      return undefined;
    const currentId = this.state.activeQueue[this.state.currentIndex];
    return this.state.associations.find((a) => a.id === currentId);
  }

  public updateList(newList: AssociationList): GlimmindGame {
    return new GlimmindGame(newList, this.state, this.trackingEnabled);
  }

  public restart(overrideList?: AssociationList): GlimmindGame {
    // Reset all associations to initial state for full restart, except archived ones.
    // Lifetime counters (hits/misses/timesPlayed) are carried over from the
    // current game state so they survive learning resets.
    const listToUse = overrideList || this.initialList;
    const currentAssociations = this.state.associations;
    const resetAssociations = listToUse.associations.map((a) => {
      if (a.isArchived) return a;
      const played = currentAssociations.find((c) => c.id === a.id);
      return {
        ...a,
        currentCycle: 1,
        status: "pending",
        isLearned: false,
        hits: played?.hits ?? a.hits ?? 0,
        misses: played?.misses ?? a.misses ?? 0,
        timesPlayed: played?.timesPlayed ?? a.timesPlayed ?? 0,
        lastPlayedAt: played?.lastPlayedAt ?? a.lastPlayedAt,
        createdAt: played?.createdAt ?? a.createdAt,
        updatedAt: played?.updatedAt ?? a.updatedAt,
      } as Association;
    });
    const resetList: AssociationList = {
      ...listToUse,
      associations: resetAssociations,
    };
    const initialState = GlimmindGame._initializeGame(resetList);
    return new GlimmindGame(resetList, initialState, this.trackingEnabled);
  }

  public reveal(): GlimmindGame {
    if (this.state.revealed) return this;
    const currentId = this.currentAssociation?.id;
    const revealedAssociations = currentId && !this.state.revealedAssociations.includes(currentId)
      ? [...this.state.revealedAssociations, currentId]
      : this.state.revealedAssociations;

    return new GlimmindGame(this.initialList, {
      ...this.state,
      revealed: true,
      revealedAssociations,
    }, this.trackingEnabled);
  }

  public setUserInput(input: string): GlimmindGame {
    const newState: GameState = {
      ...this.state,
      userInput: input,
      feedback: "none",
      similarity: null,
    };
    return new GlimmindGame(this.initialList, newState, this.trackingEnabled);
  }

  public updateCurrentAssociation(term: string, definition: string[]): GlimmindGame {
    const current = this.currentAssociation;
    if (!current) return this;

    const trimmedTerm = term.trim();
    const trimmedDef = definition.map((d) => d.trim());
    const updatedAssoc = { ...current, term: trimmedTerm, definition: trimmedDef, updatedAt: Date.now() };

    const associations = this.state.associations.map(a => a.id === current.id ? updatedAssoc : a);

    return new GlimmindGame(this.initialList, {
      ...this.state,
      associations,
    }, this.trackingEnabled);
  }

  /**
   * Removes an association from the game: drops it from both the associations
   * and the active queue, adjusts currentIndex when needed and resets the
   * transient answer state so the next card starts clean. If the queue is
   * exhausted afterwards, advances to the next cycle or ends the game.
   */
  public removeAssociation(associationId: string): GlimmindGame {
    if (this.state.isFinished) return this;
    const target = this.state.associations.find((a) => a.id === associationId);
    if (!target) return this;

    const removedQueueIndex = this.state.activeQueue.indexOf(associationId);
    const associations = this.state.associations.filter((a) => a.id !== associationId);
    const activeQueue = this.state.activeQueue.filter((id) => id !== associationId);
    const currentIndex =
      removedQueueIndex >= 0 && removedQueueIndex < this.state.currentIndex
        ? this.state.currentIndex - 1
        : this.state.currentIndex;

    const nextState: GameState = {
      ...this.state,
      associations,
      activeQueue,
      currentIndex,
      revealed: false,
      userInput: "",
      feedback: "none",
      similarity: null,
      lastAttempt: "",
      mode: undefined,
      expectedAnswers: undefined,
      expectedCount: undefined,
      foundAnswers: undefined,
      remainingCount: undefined,
      isNearComplete: undefined,
    };
    return new GlimmindGame(this.initialList, nextState, this.trackingEnabled)._checkForNextCycle();
  }

  public goBack(): GlimmindGame {
    if (this.state.currentIndex <= 0) return this;
    const newIndex = this.state.currentIndex - 1;
    const previousId = this.state.activeQueue[newIndex];
    const revealedAssociations = previousId
      ? this.state.revealedAssociations.filter((id) => id !== previousId)
      : this.state.revealedAssociations;

    return new GlimmindGame(this.initialList, {
      ...this.state,
      currentIndex: newIndex,
      revealed: false,
      userInput: "",
      feedback: "none",
      similarity: null,
      lastAttempt: "",
      revealedAssociations,
      mode: undefined,
      expectedAnswers: undefined,
      expectedCount: undefined,
      foundAnswers: undefined,
      remainingCount: undefined,
      isNearComplete: undefined,
    }, this.trackingEnabled);
  }

  public checkAnswer(): GlimmindGame {
    const current = this.currentAssociation;
    if (!current || this.state.revealed) return this;

    const userAnswer = this.state.userInput.trim();
    const isReversed = this.initialList.settings.flipOrder === "reversed";
    const mode: EngineMode = isReversed ? 'INVERSE' : 'DIRECT';
    const expectedAnswers = isReversed
      ? [current.term.trim()]
      : current.definition.map((d) => d.trim());
    const ignoreArticles = this.initialList.settings.ignoreArticles === true;

    let bestSimilarity = 0;
    let bestAnswer = expectedAnswers[0] ?? '';
    for (const expected of expectedAnswers) {
      const similarity = calculateSimilarity(userAnswer, expected, ignoreArticles);
      if (similarity > bestSimilarity) {
        bestSimilarity = similarity;
        bestAnswer = expected;
      }
    }

    const threshold = this.initialList.settings.threshold * 100;
    const isCorrect = bestSimilarity >= threshold;

    const foundAnswers = this.state.foundAnswers ?? [];
    const expectedCount = expectedAnswers.length;
    const remainingBefore = expectedCount - foundAnswers.length;

    const newAttempt = {
      userInput: userAnswer,
      similarity: bestSimilarity,
      threshold,
      expectedAnswer: bestAnswer,
      timestamp: Date.now(),
      associationId: current.id,
    };

    const updatedAttempts = [...this.state.attempts, newAttempt];

    if (isCorrect) {
      const alreadyFound = foundAnswers.some(
        (answer) => normalizeAnswer(answer) === normalizeAnswer(bestAnswer),
      );
      const nextFoundAnswers = alreadyFound ? foundAnswers : [...foundAnswers, bestAnswer];
      const nextRemaining = expectedCount - nextFoundAnswers.length;
      const isCardComplete = nextRemaining <= 0;
      const isNearComplete = nextRemaining === 1;
      const revealedAssociations =
        isCardComplete && !this.state.revealedAssociations.includes(current.id)
          ? [...this.state.revealedAssociations, current.id]
          : this.state.revealedAssociations;

      const correctState: GameState = {
        ...this.state,
        revealed: isCardComplete,
        feedback: "correct",
        similarity: Math.round(bestSimilarity),
        lastAttempt: userAnswer,
        attempts: updatedAttempts,
        revealedAssociations,
        mode,
        expectedAnswers,
        expectedCount,
        foundAnswers: nextFoundAnswers,
        remainingCount: Math.max(0, nextRemaining),
        isNearComplete,
      };
      return new GlimmindGame(this.initialList, correctState, this.trackingEnabled);
    } else {
      const associations = [...this.state.associations];
      if (this.trackingEnabled) {
        const assocIndex = associations.findIndex((a) => a.id === current.id);
        if (assocIndex >= 0) {
          associations[assocIndex] = {
            ...associations[assocIndex],
            misses: (associations[assocIndex].misses ?? 0) + 1,
            lastPlayedAt: Date.now(),
            updatedAt: Date.now(),
          };
        }
      }
      const incorrectState: GameState = {
        ...this.state,
        associations,
        feedback: "incorrect",
        userInput: "",
        similarity: Math.round(bestSimilarity),
        lastAttempt: userAnswer,
        attempts: updatedAttempts,
        mode,
        expectedAnswers,
        expectedCount,
        foundAnswers,
        remainingCount: remainingBefore,
      };
      return new GlimmindGame(this.initialList, incorrectState, this.trackingEnabled);
    }
  }

  public processAction(action: { type: "CORRECT" | "PASS" }): GlimmindGame {
    if (this.state.isFinished) return this;
    const currentAssoc = this.currentAssociation;
    if (!currentAssoc) return this._checkForNextCycle();

    let associations = [...this.state.associations];
    const assocIndex = associations.findIndex((a) => a.id === currentAssoc.id);

    const revealedAssociations = !this.state.revealedAssociations.includes(currentAssoc.id)
      ? [...this.state.revealedAssociations, currentAssoc.id]
      : this.state.revealedAssociations;

    if (action.type === "CORRECT") {
      associations[assocIndex] = {
        ...currentAssoc,
        status: "correct",
        isLearned: this.state.globalCycle === 1 ? true : currentAssoc.isLearned,
        hits: this.trackingEnabled ? (currentAssoc.hits ?? 0) + 1 : currentAssoc.hits,
        timesPlayed: this.trackingEnabled ? (currentAssoc.timesPlayed ?? 0) + 1 : currentAssoc.timesPlayed,
        lastPlayedAt: this.trackingEnabled ? Date.now() : currentAssoc.lastPlayedAt,
        updatedAt: Date.now(),
      };
    } else if (action.type === "PASS") {
      const nextCycle = Math.min(currentAssoc.currentCycle + 1, 4) as GameCycle;
      associations[assocIndex] = {
        ...currentAssoc,
        currentCycle: nextCycle,
        status: nextCycle >= 4 ? "correct" : "pending",
        timesPlayed: this.trackingEnabled ? (currentAssoc.timesPlayed ?? 0) + 1 : currentAssoc.timesPlayed,
        lastPlayedAt: this.trackingEnabled ? Date.now() : currentAssoc.lastPlayedAt,
        updatedAt: Date.now(),
      };
    }

    const nextState: GameState = {
      ...this.state,
      associations,
      currentIndex: this.state.currentIndex + 1,
      revealed: false,
      userInput: "",
      feedback: "none",
      similarity: null,
      lastAttempt: "",
      revealedAssociations,
      mode: undefined,
      expectedAnswers: undefined,
      expectedCount: undefined,
      foundAnswers: undefined,
      remainingCount: undefined,
      isNearComplete: undefined,
    };
    const nextGame = new GlimmindGame(this.initialList, nextState, this.trackingEnabled);
    return nextGame._checkForNextCycle();
  }

  private _checkForNextCycle(): GlimmindGame {
    if (this.state.currentIndex < this.state.activeQueue.length) return this;
    
    const newQueue = GlimmindGame._generateActiveQueue(
      this.state.associations,
      this.state.globalCycle,
    );
    
    if (newQueue.length === 0) return this._endGame();

    const nextGlobalCycle = Math.min(this.state.globalCycle + 1, 4) as GameCycle;
    const nextState: GameState = {
      ...this.state,
      globalCycle: nextGlobalCycle,
      activeQueue: newQueue,
      currentIndex: 0,
    };
    return new GlimmindGame(this.initialList, nextState, this.trackingEnabled);
  }

  private _endGame(): GlimmindGame {
    const summary = GlimmindGame._calculateSummary(this.state.associations);
    const finalState: GameState = {
      ...this.state,
      isFinished: true,
      summary: summary,
    };
    return new GlimmindGame(this.initialList, finalState, this.trackingEnabled);
  }

  private static _calculateSummary(associations: Association[]): GameSummary {
    return associations
      .filter(a => !a.isArchived)
      .reduce(
        (summary, assoc) => {
          if (assoc.isLearned) summary.learned++;
          else {
            switch (assoc.currentCycle) {
              case 4:
              case 5:
                summary.known++;
                break;
              case 3:
                summary.recognized++;
                break;
              case 2:
                summary.seen++;
                break;
            }
          }
          return summary;
        },
        { learned: 0, known: 0, recognized: 0, seen: 0 },
      );
  }

  private static _initializeGame(list: AssociationList): GameState {
    const initialAssociations = [...list.associations];
    
    // Calculate current global cycle based on highest cycle among unarchived associations
    const unarchivedAssocs = initialAssociations.filter(a => !a.isArchived);
    const currentCycle: GameCycle = Math.max(
      1,
      unarchivedAssocs.reduce(
        (max, a) => Math.max(max, a.currentCycle || 1),
        1
      )
    ) as GameCycle;
    
    // Calculate summary based on current state of associations
    const summary = GlimmindGame._calculateSummary(initialAssociations);
    
    const shuffle = (arr: string[]) => arr.sort(() => Math.random() - 0.5);
    const activeQueue = GlimmindGame._generateActiveQueue(
      initialAssociations,
      currentCycle,
    );
    const shuffledQueue = shuffle(activeQueue);
    const state: GameState = {
      ...INITIAL_GAME_STATE,
      globalCycle: currentCycle,
      listId: list.id,
      associations: initialAssociations,
      activeQueue: shuffledQueue,
      summary,
    };
    if (state.activeQueue.length === 0) {
      state.isFinished = true;
    }
    return state;
  }

  private static _generateActiveQueue(
    associations: Association[],
    _cycle: GameCycle,
  ): string[] {
    return associations
      .filter((a) => !a.isArchived && !a.isLearned && a.status !== "correct")
      .map((a) => a.id);
  }
}

