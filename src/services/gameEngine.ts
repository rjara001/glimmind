import {
  Association,
  AssociationList,
  GameState,
  GameCycle,
  GameSummary,
} from "../types";

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
 * Function words (articles/prepositions) that can be ignored during
 * comparison when the list setting ignoreArticles is enabled.
 */
const IGNORED_WORDS = new Set([
  "the", "a", "an", "to", "at", "in", "on", "of", "for", "with", "by",
  "from", "as", "and", "or",
  "el", "la", "los", "las", "un", "una", "unos", "unas",
  "de", "a", "en", "para", "con", "por",
]);

/**
 * Normalizes a string for comparison: lowercase, remove accents and, when
 * ignoreArticles is enabled, drop function words comparing token by token.
 */
function normalizeString(s: string, ignoreArticles: boolean): string {
  const normalized = s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[-–—]+/g, ' ')
    .replace(/[^\w\s]/gi, "");

  if (!ignoreArticles) return normalized;

  return normalized
    .split(/\s+/)
    .filter((token) => token.length > 0 && !IGNORED_WORDS.has(token))
    .join(" ");
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
  const aNormalized = normalizeString(a.trim(), ignoreArticles);
  const bNormalized = normalizeString(b.trim(), ignoreArticles);

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

  public updateCurrentAssociation(term: string, definition: string): GlimmindGame {
    const current = this.currentAssociation;
    if (!current) return this;

    const trimmedTerm = term.trim();
    const trimmedDef = definition.trim();
    const updatedAssoc = { ...current, term: trimmedTerm, definition: trimmedDef, updatedAt: Date.now() };

    const associations = this.state.associations.map(a => a.id === current.id ? updatedAssoc : a);

    return new GlimmindGame(this.initialList, {
      ...this.state,
      associations,
    }, this.trackingEnabled);
  }

  public checkAnswer(): GlimmindGame {
    const current = this.currentAssociation;
    if (!current || this.state.revealed) return this;

    const userAnswer = this.state.userInput.trim();
    const isReversed = this.initialList.settings.flipOrder === "reversed";
    const correctAnswer = isReversed
      ? current.term.trim()
      : current.definition.trim();
    const ignoreArticles = this.initialList.settings.ignoreArticles === true;
    const similarity = calculateSimilarity(userAnswer, correctAnswer, ignoreArticles);
    const threshold = this.initialList.settings.threshold * 100;
    const isCorrect =
      userAnswer.toLowerCase() === correctAnswer.toLowerCase() ||
      similarity >= threshold;

    const newAttempt = {
      userInput: userAnswer,
      similarity,
      threshold,
      expectedAnswer: correctAnswer,
      timestamp: Date.now(),
      associationId: current.id,
    };

    const updatedAttempts = [...this.state.attempts, newAttempt];

    if (isCorrect) {
      const revealedAssociations = !this.state.revealedAssociations.includes(current.id)
        ? [...this.state.revealedAssociations, current.id]
        : this.state.revealedAssociations;

      const correctState: GameState = {
        ...this.state,
        revealed: true,
        feedback: "correct",
        similarity: 100,
        lastAttempt: userAnswer,
        attempts: updatedAttempts,
        revealedAssociations,
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
        similarity,
        lastAttempt: userAnswer,
        attempts: updatedAttempts,
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
      associations[assocIndex] = {
        ...currentAssoc,
        currentCycle: (currentAssoc.currentCycle + 1) as GameCycle,
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
    };
    const nextGame = new GlimmindGame(this.initialList, nextState, this.trackingEnabled);
    return nextGame._checkForNextCycle();
  }

  private _checkForNextCycle(): GlimmindGame {
    if (this.state.currentIndex < this.state.activeQueue.length) return this;
    const nextGlobalCycle = this.state.globalCycle + 1;
    if (nextGlobalCycle > 4) return this._endGame();

    const newQueue = GlimmindGame._generateActiveQueue(
      this.state.associations,
      nextGlobalCycle as GameCycle,
    );
    if (newQueue.length === 0) return this._endGame();

    const nextState: GameState = {
      ...this.state,
      globalCycle: nextGlobalCycle as GameCycle,
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
    // Include all non-archived associations that haven't completed cycle 4 and are not already correctly answered
    return associations
      .filter((a) => !a.isArchived && a.currentCycle < 4 && a.status !== "correct")
      .map((a) => a.id);
  }
}

