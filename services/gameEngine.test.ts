import { describe, it, expect } from 'vitest';
import { GlimmindGame } from './gameEngine';
import { Association, AssociationList } from '../types';

const createMockAssociations = (count: number): Association[] => {
    return Array.from({ length: count }, (_, i) => ({
        id: `${i + 1}`,
        term: `Term ${i + 1}`,
        definition: `Def ${i + 1}`,
        status: 'pending' as const,
        currentCycle: 1 as const,
        isLearned: false,
        isArchived: false,
    }));
};

const createMockList = (associations: Association[]): AssociationList => ({
    id: 'list1', userId: 'user1', name: 'Test List', concept: 'Term/Def',
    associations,
    isArchived: false,
    settings: { mode: 'real', flipOrder: 'normal', threshold: 0.9 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

describe('GlimmindGame', () => {
    it('creates game with initial state', () => {
        const associations = createMockAssociations(3);
        const list = createMockList(associations);
        
        const game = GlimmindGame.create(list);

        expect(game.currentAssociation).toBeDefined();
    });

    it('processes PASS action correctly', () => {
        const associations = createMockAssociations(1);
        const list = createMockList(associations);
        
        const game = GlimmindGame.create(list);

        const result = game.processAction({ type: 'PASS' });
        
        expect(result.state.globalCycle).toBe(2);
        expect(result.state.currentIndex).toBe(0);
        expect(result.state.associations[0].currentCycle).toBe(2);
    });

    it('processes CORRECT action correctly', () => {
        const associations = createMockAssociations(1);
        const list = createMockList(associations);
        
        const game = GlimmindGame.create(list);

        const revealed = game.reveal();
        const result = revealed.processAction({ type: 'CORRECT' });
        expect(result.state.currentIndex).toBe(1);
    });

    it('calculates summary on game end', () => {
        const associations = createMockAssociations(3);
        const list = createMockList(associations);
        
        const game = GlimmindGame.create(list);

        const finalGame = game.restart();
        expect(finalGame.state.summary).toBeDefined();
    });

    describe('reveal', () => {
        it('reveals the answer', () => {
            const list = createMockList(createMockAssociations(1));
            const game = GlimmindGame.create(list);
            
            const revealed = game.reveal();
            
            expect(revealed.state.revealed).toBe(true);
        });

        it('does not reveal twice', () => {
            const list = createMockList(createMockAssociations(1));
            const game = GlimmindGame.create(list);
            
            const revealed1 = game.reveal();
            const revealed2 = revealed1.reveal();
            
            expect(revealed2.state.revealed).toBe(true);
        });
    });

    describe('multiple cards', () => {
        it('processes multiple PASS actions across cards', () => {
            const associations = createMockAssociations(3);
            const list = createMockList(associations);
            
            const game = GlimmindGame.create(list);
            
            let result = game.processAction({ type: 'PASS' });
            expect(result.state.currentIndex).toBe(1);
            
            result = result.processAction({ type: 'PASS' });
            expect(result.state.currentIndex).toBe(2);
            
            result = result.processAction({ type: 'PASS' });
            expect(result.state.currentIndex).toBe(0);
            expect(result.state.globalCycle).toBe(2);
        });

        it('processes CORRECT marks card as learned in cycle 1', () => {
            const associations = createMockAssociations(3);
            const list = createMockList(associations);
            
            const game = GlimmindGame.create(list);
            
            const revealed = game.reveal();
            const result = revealed.processAction({ type: 'CORRECT' });
            
            const processedCard = result.state.associations.find(a => a.status === 'correct');
            expect(processedCard).toBeDefined();
            expect(processedCard?.isLearned).toBe(true);
        });

        it('cycles through all cards and finishes', () => {
            const associations = createMockAssociations(3);
            const list = createMockList(associations);
            
            let game = GlimmindGame.create(list);
            
            for (let i = 0; i < 3; i++) {
                game = game.processAction({ type: 'PASS' });
            }
            
            expect(game.state.isFinished).toBe(false);
            expect(game.state.globalCycle).toBe(2);
        });
    });

    describe('game progression', () => {
        it('passes through cycles 1 to 4', () => {
            const associations = createMockAssociations(1);
            const list = createMockList(associations);
            
            let game = GlimmindGame.create(list);
            expect(game.state.globalCycle).toBe(1);
            
            game = game.processAction({ type: 'PASS' });
            expect(game.state.globalCycle).toBe(2);
            
            game = game.processAction({ type: 'PASS' });
            expect(game.state.globalCycle).toBe(3);
            
            game = game.processAction({ type: 'PASS' });
            expect(game.state.globalCycle).toBe(4);
        });

        it('ends after cycle 4', () => {
            const associations = createMockAssociations(1);
            const list = createMockList(associations);
            
            let game = GlimmindGame.create(list);
            
            game = game.processAction({ type: 'PASS' });
            game = game.processAction({ type: 'PASS' });
            game = game.processAction({ type: 'PASS' });
            game = game.processAction({ type: 'PASS' });
            
            expect(game.state.isFinished).toBe(true);
            expect(game.state.summary).toBeDefined();
        });
    });

    describe('setUserInput', () => {
        it('updates user input', () => {
            const list = createMockList(createMockAssociations(1));
            const game = GlimmindGame.create(list);
            
            const withInput = game.setUserInput('test answer');
            
            expect(withInput.state.userInput).toBe('test answer');
            expect(withInput.state.feedback).toBe('none');
        });
    });

    describe('restart', () => {
        it('resets game to initial state', () => {
            const associations = createMockAssociations(3);
            const list = createMockList(associations);
            
            let game = GlimmindGame.create(list);
            game = game.processAction({ type: 'PASS' });
            
            const restarted = game.restart();
            
            expect(restarted.state.globalCycle).toBe(1);
            expect(restarted.state.currentIndex).toBe(0);
            expect(restarted.state.isFinished).toBe(false);
        });
    });

    describe('empty list', () => {
        it('finishes immediately with empty list', () => {
            const list = createMockList([]);
            const game = GlimmindGame.create(list);
            
            expect(game.state.isFinished).toBe(true);
            expect(game.state.summary).toBeDefined();
        });
    });

    describe('archived associations', () => {
        it('filters out archived associations', () => {
            const associations: Association[] = [
                { id: '1', term: 'Term 1', definition: 'Def 1', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
                { id: '2', term: 'Term 2', definition: 'Def 2', status: 'pending', currentCycle: 1, isLearned: false, isArchived: true },
                { id: '3', term: 'Term 3', definition: 'Def 3', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            ];
            const list = createMockList(associations);
            
            const game = GlimmindGame.create(list);
            
            expect(game.state.associations.length).toBe(2);
            expect(game.state.activeQueue.length).toBe(2);
        });
    });
});

