
import { describe, it, expect } from 'vitest';
import { GlimmindGame } from './gameEngine';
import { Association, AssociationList, AssociationStatus, GameState, CycleResult } from '../types';

// --- Test Case Generation Helpers ---

const rep = (action: 'P' | 'C', times: number): Array<'P' | 'C'> => Array(times).fill(action);

const createMockAssociations = (count: number): Association[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `${i + 1}`,
        term: `Term ${i + 1}`,
        definition: `Def ${i + 1}`,
        status: AssociationStatus.DESCONOCIDA,
        cycleResult: 'pending' as CycleResult,
    }));
};

const createMockList = (associations: Association[]): AssociationList => ({
    id: 'list1', userId: 'user1', name: 'Test List', concept: 'Term/Def',
    associations,
    settings: { mode: 'real', flipOrder: 'normal', threshold: 0.9 },
    createdAt: Date.now(),
});

const initialEngineState: GameState = {
    listId: '', associations: [], initialAssociations: [], currentCycle: 1, currentIndex: 0, queue: [],
    isFinished: false, revealed: false, wasRevealed: false, userInput: '',
    statusCounts: { [AssociationStatus.DESCONOCIDA]:{p:0,c:0}, [AssociationStatus.DESCUBIERTA]:{p:0,c:0}, [AssociationStatus.RECONOCIDA]:{p:0,c:0}, [AssociationStatus.CONOCIDA]:{p:0,c:0} },
    sessionStats: { newlyLearned: 0 },
};

// --- Test Runner ---

interface ExpectedResult {
    [key: string]: { p?: number; c?: number } | boolean;
    isFinished?: boolean;
}

const runTest = (name: string, cardCount: number, actions: Array<'P' | 'C'>, expected: ExpectedResult) => {
    it(name, () => {
        const mockAssociations = createMockAssociations(cardCount);
        const mockList = createMockList(mockAssociations);
        
        let game = new GlimmindGame(initialEngineState).processAction({ type: 'START_GAME', payload: { list: mockList } });

        for (const action of actions) {
            game = game.processAction({ type: action === 'P' ? 'PASS' : 'CORRECT' });
        }

        const finalState = game.currentState;

        for (const key in expected) {
            if (key === 'isFinished') {
                expect(finalState.isFinished, 'isFinished flag').toBe(expected.isFinished);
            } else {
                const expectedCounts = expected[key] as { p?: number; c?: number };
                const actualCounts = finalState.statusCounts[key as AssociationStatus];
                
                if (expectedCounts.p !== undefined) {
                    expect(actualCounts.p, `Pending count for ${key}`).toBe(expectedCounts.p);
                }
                if (expectedCounts.c !== undefined) {
                    expect(actualCounts.c, `Correct count for ${key}`).toBe(expectedCounts.c);
                }
            }
        }
    });
};

// --- Comprehensive Test Suite (No-reset logic) ---

describe('Glimmind Algorithm Comprehensive Tests (No-reset logic)', () => {

    // ── Ciclo 1 basics ──
    runTest("01 · 3 cartas, 3 PASS → todas DESCUBIERTA", 3, rep("P", 3), { DESCUBIERTA: { p: 3, c: 0 } });
    runTest("02 · 3 cartas, 3 CORRECT → todas DESCONOCIDA(c)", 3, rep("C", 3), { DESCONOCIDA: { p: 0, c: 3 } });
    runTest("03 · 3 cartas, 1C + 2P → DESCONOCIDA 1c, DESCUBIERTA 2p", 3, ["C", "P", "P"], { DESCONOCIDA: { c: 1 }, DESCUBIERTA: { p: 2 } });
    runTest("04 · 3 cartas, 2P + 1C → DESCONOCIDA 1c, DESCUBIERTA 2p", 3, ["P", "P", "C"], { DESCONOCIDA: { c: 1 }, DESCUBIERTA: { p: 2 } });

    // ── Ciclo 2 ──
    runTest("05 · 3 cartas, 6 PASS → todas RECONOCIDA", 3, rep("P", 6), { RECONOCIDA: { p: 3, c: 0 } });
    runTest("06 · 3 cartas, 3P + 3C → DESCUBIERTA 0p 3c", 3, [...rep("P", 3), ...rep("C", 3)], { DESCUBIERTA: { p: 0, c: 3 } });
    runTest("07 · 3 cartas, 4P + 1C → DESCUBIERTA 1c, RECONOCIDA 1p", 3, [...rep("P", 3), "P", "C"], { DESCUBIERTA: { c: 1 }, RECONOCIDA: { p: 1 } });
    runTest("08 · 3 cartas, 5 PASS → DESCUBIERTA 1p, RECONOCIDA 2p", 3, rep("P", 5), { DESCUBIERTA: { p: 1 }, RECONOCIDA: { p: 2 } });

    // ── Ciclo 3 ──
    runTest("09 · 3 cartas, 9 PASS → todas CONOCIDA", 3, rep("P", 9), { CONOCIDA: { p: 3, c: 0 } });
    runTest("10 · 3 cartas, 6P + 3C → RECONOCIDA 0p 3c", 3, [...rep("P", 6), ...rep("C", 3)], { RECONOCIDA: { p: 0, c: 3 } });

    // ── Ciclo 4 (CONOCIDA) & Fin de juego ──
    runTest("11 · 3 cartas, 9 PASS → todas CONOCIDA", 3, rep("P", 9), { CONOCIDA: { p: 3, c: 0 } });
    runTest("12 · 3 cartas, 6P + 3C → RECONOCIDA 0p 3c", 3, [...rep("P", 6), ...rep("C", 3)], { RECONOCIDA: { c: 3 } });
    runTest("13 · 3 cartas, 9P + 3C → CONOCIDA 3c, isFinished", 3, [...rep("P", 9), ...rep("C", 3)], { CONOCIDA: { p: 0, c: 3 }, isFinished: true });

    // ── 10 cartas ──
    runTest("14 · 10 cartas, 10 PASS → todas DESCUBIERTA", 10, rep("P", 10), { DESCUBIERTA: { p: 10, c: 0 } });
    runTest("15 · 10 cartas, 30 PASS → todas CONOCIDA pending", 10, rep("P", 30), { CONOCIDA: { p: 10, c: 0 } });
    runTest("16 · 10 cartas, 6P + 4C → DESCONOCIDA 4c, DESCUBIERTA 6p", 10, [...rep("P", 6), ...rep("C", 4)], { DESCONOCIDA: { c: 4 }, DESCUBIERTA: { p: 6 } });
    
    // Corrected test cases based on NO-RESET logic
    runTest("17 · 10 cartas, 35P + 2C → CONOCIDA { p: 8, c: 2 }", 10, [...rep("P", 35), ...rep("C", 2)], { CONOCIDA: {p: 8, c: 2} });

    // ── Flujo complejo ──
    runTest("18 · 3 cartas, 7P+1C+2P+1C+1C → RECONOCIDA 1c, CONOCIDA 2c", 3, [...rep("P", 7), "C", ...rep("P", 2), "C", "C"], { RECONOCIDA: { c: 1 }, CONOCIDA: { c: 2 } });
    runTest("19 · 3 cartas, 3P + 1C + 2P → DESCUBIERTA 1c, RECONOCIDA 2p", 3, [...rep("P", 3), "C", ...rep("P", 2)], { DESCUBIERTA: { c: 1 }, RECONOCIDA: { p: 2 } });
    runTest("20 · 10 cartas, 30P + 10C → CONOCIDA 10c, isFinished", 10, [...rep("P", 30), ...rep("C", 10)], { CONOCIDA: { p: 0, c: 10 }, isFinished: true });
});
