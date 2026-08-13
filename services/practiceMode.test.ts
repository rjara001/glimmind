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
    settings: { mode: 'training', flipOrder: 'normal', threshold: 0.9 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
});

describe('GlimmindGame Practice Mode States', () => {
    it('initializes with revealed: false', () => {
        const list = createMockList(createMockAssociations(2));
        const game = GlimmindGame.create(list);
        
        expect(game.state.revealed).toBe(false);
    });

    it('stays hidden after PASS if not explicitly revealed', () => {
        const list = createMockList(createMockAssociations(2));
        let game = GlimmindGame.create(list);
        
        // Pass first card
        game = game.processAction({ type: 'PASS' });
        
        // Next card should also be hidden
        expect(game.state.revealed).toBe(false);
    });

    it('resets revealed to false after PASS even if revealed was true', () => {
        const list = createMockList(createMockAssociations(2));
        let game = GlimmindGame.create(list);
        
        // Reveal first card
        game = game.reveal();
        expect(game.state.revealed).toBe(true);
        
        // Move to next card
        game = game.processAction({ type: 'PASS' });
        
        // New card should be hidden
        expect(game.state.revealed).toBe(false);
    });

    it('resets revealed to false after CORRECT', () => {
        const list = createMockList(createMockAssociations(2));
        let game = GlimmindGame.create(list);
        
        // Reveal/Answer first card
        game = game.reveal();
        game = game.processAction({ type: 'CORRECT' });
        
        // New card should be hidden
        expect(game.state.revealed).toBe(false);
    });

    it('tracks revealedAssociations correctly for history/AttemptList', () => {
        const list = createMockList(createMockAssociations(2));
        let game = GlimmindGame.create(list);
        const firstId = game.currentAssociation?.id;
        
        // PASS should add to revealedAssociations
        game = game.processAction({ type: 'PASS' });
        expect(game.state.revealedAssociations).toContain(firstId);
    });
});
