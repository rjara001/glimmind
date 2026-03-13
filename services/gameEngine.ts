
import { Association, AssociationList, GameState, GameCycle, GameSummary } from "../types";

const INITIAL_GAME_STATE: Omit<GameState, 'listId' | 'associations'> = {
  globalCycle: 1,
  activeQueue: [],
  currentIndex: 0,
  isFinished: false,
  summary: null,
  revealed: false,
  userInput: "",
};

export class GlimmindGame {
  private state: GameState;

  constructor(associationList: AssociationList) {
    this.state = this._initializeGame(associationList);
  }

  public get currentState(): GameState {
    return this.state;
  }

  public get currentAssociation(): Association | undefined {
    if (this.state.isFinished || !this.state.activeQueue[this.state.currentIndex]) {
      return undefined;
    }
    const currentId = this.state.activeQueue[this.state.currentIndex];
    return this.state.associations.find(a => a.id === currentId);
  }

  public processAction(action: { type: 'CORRECT' | 'PASS' }): GlimmindGame {
    if (this.state.isFinished) {
      return this;
    }

    const currentAssoc = this.currentAssociation;
    if (!currentAssoc) {
      return this._checkForNextCycle();
    }

    let associations = [...this.state.associations];
    const assocIndex = associations.findIndex(a => a.id === currentAssoc.id);

    if (action.type === 'CORRECT') {
      associations[assocIndex] = {
        ...currentAssoc,
        status: 'correct',
        isLearned: this.state.globalCycle === 1 ? true : currentAssoc.isLearned,
      };
    } else if (action.type === 'PASS') {
      associations[assocIndex] = {
        ...currentAssoc,
        currentCycle: (currentAssoc.currentCycle + 1) as GameCycle,
      };
    }
    
    this.state = {
      ...this.state,
      associations,
      currentIndex: this.state.currentIndex + 1,
      revealed: false,
      userInput: ''
    };
    
    return this._checkForNextCycle();
  }

  private _checkForNextCycle(): GlimmindGame {
    if (this.state.currentIndex < this.state.activeQueue.length) {
      return this;
    }

    const nextGlobalCycle = this.state.globalCycle + 1;

    if (nextGlobalCycle > 4) {
      return this._endGame();
    }

    this.state = {
      ...this.state,
      globalCycle: nextGlobalCycle as GameCycle,
    };
    
    const newQueue = this._generateActiveQueue();

    if (newQueue.length === 0) {
        return this._endGame();
    }

    this.state.activeQueue = newQueue;
    this.state.currentIndex = 0;

    return this;
  }
  
  private _endGame(): GlimmindGame {
      this.state.isFinished = true;
      this.state.summary = this._calculateSummary();
      return this;
  }

  private _calculateSummary(): GameSummary {
    const summary: GameSummary = {
      learned: 0,
      known: 0,
      recognized: 0,
      seen: 0,
    };

    for (const assoc of this.state.associations) {
      if (assoc.isLearned) {
        summary.learned++;
      } else {
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
    }
    return summary;
  }
  
  private _initializeGame(list: AssociationList): GameState {
    const initialAssociations = list.associations.map(a => ({
      ...a,
      currentCycle: 1,
      status: 'pending',
      isLearned: false,
    } as Association));

    const state: GameState = {
      ...INITIAL_GAME_STATE,
      listId: list.id,
      associations: initialAssociations,
    };
    
    state.activeQueue = this._generateActiveQueue(initialAssociations, 1);

    if (state.activeQueue.length === 0) {
        state.isFinished = true;
        state.summary = this._calculateSummary();
    }

    return state;
  }
  
  private _generateActiveQueue(associations = this.state.associations, cycle = this.state.globalCycle): string[] {
    return associations
      .filter(a => a.currentCycle === cycle && a.status === 'pending')
      .map(a => a.id);
  }
}
