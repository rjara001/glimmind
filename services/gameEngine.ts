
import { Association, AssociationList, AssociationStatus, CycleResult, GameState, StatusCounts, GameCycle } from "../types";

const STATUS_ORDER: AssociationStatus[] = [
    AssociationStatus.DESCONOCIDA, AssociationStatus.DESCUBIERTA, 
    AssociationStatus.RECONOCIDA, AssociationStatus.CONOCIDA
];

const getInitialStatusCounts = (): StatusCounts => ({
    [AssociationStatus.DESCONOCIDA]: { p: 0, c: 0 }, [AssociationStatus.DESCUBIERTA]: { p: 0, c: 0 },
    [AssociationStatus.RECONOCIDA]: { p: 0, c: 0 }, [AssociationStatus.CONOCIDA]: { p: 0, c: 0 },
});

const initialEngineState: GameState = {
    listId: '', associations: [], initialAssociations: [], currentCycle: 1, currentIndex: 0, queue: [],
    isFinished: false, revealed: false, wasRevealed: false, userInput: '',
    statusCounts: getInitialStatusCounts(), sessionStats: { newlyLearned: 0 },
};

const calculateStatusCounts = (associations: Association[]): StatusCounts => {
    const counts = getInitialStatusCounts();
    for (const assoc of associations) {
        if (counts[assoc.status]) { assoc.cycleResult === 'pending' ? counts[assoc.status].p++ : counts[assoc.status].c++; }
    }
    return counts;
};

const isGameFinished = (counts: StatusCounts, total: number): boolean => {
    return counts[AssociationStatus.CONOCIDA].c === total;
};

export class GlimmindGame {
    private state: GameState;

    constructor(initialState: GameState) { this.state = { ...initialState }; }

    get currentState(): GameState { return this.state; }
    get currentAssoc(): Association | undefined {
        const currentId = this.state.queue[this.state.currentIndex];
        return this.state.associations.find(a => a.id === currentId);
    }

    processAction(action: { type: string; payload?: any }): GlimmindGame {
        let state = { ...this.state };

        if (action.type === 'START_GAME') {
            return new GlimmindGame(this._initializeGame(action.payload.list));
        }

        if (state.isFinished) return this;

        if (state.currentIndex >= state.queue.length) {
            state = this._findNextCycle(state);
        }

        if (state.currentIndex >= state.queue.length) {
            const finalCounts = calculateStatusCounts(state.associations);
            return new GlimmindGame({ ...state, statusCounts: finalCounts, isFinished: isGameFinished(finalCounts, state.associations.length) });
        }

        const currentId = state.queue[state.currentIndex];
        let newAssociations = state.associations.map(assoc => {
            if (assoc.id !== currentId) return assoc;
            if (action.type === 'CORRECT') return { ...assoc, cycleResult: 'correct' as CycleResult };
            if (action.type === 'PASS') {
                const idx = STATUS_ORDER.indexOf(assoc.status);
                const nextStatus = STATUS_ORDER[Math.min(idx + 1, STATUS_ORDER.length - 1)];
                return { ...assoc, status: nextStatus };
            }
            return assoc;
        });

        const nextState: GameState = { ...state, associations: newAssociations, currentIndex: state.currentIndex + 1 };
        const finalCounts = calculateStatusCounts(nextState.associations);
        const isFinished = isGameFinished(finalCounts, nextState.associations.length);

        return new GlimmindGame({ ...nextState, statusCounts: finalCounts, isFinished });
    }

    private _initializeGame(list: AssociationList): GameState {
        const associations = list.associations.map(a => ({ ...a, status: AssociationStatus.DESCONOCIDA, cycleResult: 'pending' as CycleResult }));
        const state: GameState = { ...initialEngineState, listId: list.id, associations, initialAssociations: JSON.parse(JSON.stringify(associations)) };
        return this._findNextCycle(state);
    }

    // Simplified logic: No automatic resets. Just find the next pending card.
    private _findNextCycle(state: GameState): GameState {
        for (let i = 0; i < STATUS_ORDER.length; i++) {
            const statusToLookFor = STATUS_ORDER[i];
            const queue = state.associations.filter(a => a.status === statusToLookFor && a.cycleResult === 'pending').map(a => a.id);
            if (queue.length > 0) {
                return { ...state, currentCycle: (i + 1) as GameCycle, currentIndex: 0, queue: queue };
            }
        }

        // If no pending cards are found anywhere, return an empty queue. The game is paused or finished.
        return { ...state, queue: [], currentIndex: 0 };
    }
}
