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
        it('passes through cycles 1 to 3 and finishes', () => {
            const associations = createMockAssociations(1);
            const list = createMockList(associations);
            
            let game = GlimmindGame.create(list);
            expect(game.state.globalCycle).toBe(1);
            
            game = game.processAction({ type: 'PASS' });
            expect(game.state.globalCycle).toBe(2);
            
            game = game.processAction({ type: 'PASS' });
            expect(game.state.globalCycle).toBe(3);
            
            game = game.processAction({ type: 'PASS' });
            // It finishes here because the card reaches cycle 4, rendering cycle 4 empty.
            expect(game.state.isFinished).toBe(true);
        });

        it('ends properly after graduating all cards', () => {
            const associations = createMockAssociations(1);
            const list = createMockList(associations);
            
            let game = GlimmindGame.create(list);
            
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
        it('filters out archived associations from active queue but preserves them in state', () => {
            const associations: Association[] = [
                { id: '1', term: 'Term 1', definition: 'Def 1', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
                { id: '2', term: 'Term 2', definition: 'Def 2', status: 'pending', currentCycle: 1, isLearned: false, isArchived: true },
                { id: '3', term: 'Term 3', definition: 'Def 3', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            ];
            const list = createMockList(associations);
            
            const game = GlimmindGame.create(list);
            
            expect(game.state.associations.length).toBe(3); // Preserved to prevent data loss
            expect(game.state.activeQueue.length).toBe(2); // Filtered out of gameplay
        });
    });

    describe('checkAnswer (Validación de Intentos)', () => {
        it('handles Intento Incorrecto correctly', () => {
            const list = createMockList([
                { id: '1', term: 'Term 1', definition: 'Correct Answer', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false }
            ]);
            let game = GlimmindGame.create(list);
            
            game = game.setUserInput('Wrong Answer');
            game = game.checkAnswer();
            
            expect(game.state.feedback).toBe('incorrect'); // Indica que debe cambiar de color a rojo
            expect(game.state.lastAttempt).toBe('Wrong Answer'); // El texto introducido por el usuario
            expect(game.state.similarity).toBeDefined();
            expect(game.state.similarity).toBeLessThan(100); // Porcentaje de similitud
            expect(game.state.userInput).toBe(''); // El campo de texto de la respuesta se limpia automáticamente
            expect(game.state.revealed).toBe(false);
        });

        it('handles Intento Correcto correctly', () => {
            const list = createMockList([
                { id: '1', term: 'Term 1', definition: 'Correct Answer', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false }
            ]);
            let game = GlimmindGame.create(list);
            
            game = game.setUserInput('Correct Answer');
            game = game.checkAnswer();
            
            expect(game.state.feedback).toBe('correct'); // Indica que debe cambiar de color a verde
            expect(game.state.lastAttempt).toBe('Correct Answer'); // El texto introducido por el usuario
            expect(game.state.similarity).toBe(100); // Porcentaje de similitud al 100%
            expect(game.state.revealed).toBe(true);
            
            // Acción para avanzar a la siguiente tarjeta (Se avanza a la siguiente tarjeta)
            game = game.processAction({ type: 'CORRECT' });
            
            expect(game.state.isFinished).toBe(true); // Se avanza y termina si solo hay una
            expect(game.state.userInput).toBe(''); // El campo de texto se limpia automáticamente
        });
    });

    describe('Similarity Algorithm Tests', () => {
        const associations: Association[] = [
            { id: '1', term: 'Circle back', definition: 'Volver', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '2', term: 'Get down to', definition: 'Ponerse a', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '3', term: 'Look up to', definition: 'Admirar', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '4', term: 'Give up', definition: 'Rendirse', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '5', term: 'Take off', definition: 'Despegar', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '6', term: 'Run into', definition: 'Encontrarse con', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '7', term: 'Put off', definition: 'Posponer', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '8', term: 'Call off', definition: 'Cancelar', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '9', term: 'Break down', definition: 'Desglosar', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
            { id: '10', term: 'Figure out', definition: 'Descubrir', status: 'pending', currentCycle: 1, isLearned: false, isArchived: false },
        ];
        const list = createMockList(associations);

        const testCases = [
            // Circle back - Volver
            { userInput: 'Circle back', expectedDef: 'Volver', desc: 'same exact case' },
            { userInput: 'circle back', expectedDef: 'Volver', desc: 'all lowercase' },
            { userInput: 'CIRCLE BACK', expectedDef: 'Volver', desc: 'all uppercase' },
            { userInput: 'Volver', expectedDef: 'Volver', desc: 'correct answer in Spanish' },
            { userInput: 'volver', expectedDef: 'Volver', desc: 'lowercase Spanish' },
            { userInput: 'Circleback', expectedDef: 'Volver', desc: 'no space' },
            { userInput: 'circleback', expectedDef: 'Volver', desc: 'no space lowercase' },
            
            // Get down to - Ponerse a
            { userInput: 'Get down to', expectedDef: 'Ponerse a', desc: 'same exact case' },
            { userInput: 'get down to', expectedDef: 'Ponerse a', desc: 'all lowercase' },
            { userInput: 'Ponerse a', expectedDef: 'Ponerse a', desc: 'correct answer' },
            { userInput: 'ponerse a', expectedDef: 'Ponerse a', desc: 'lowercase' },

            // Look up to - Admirar
            { userInput: 'Look up to', expectedDef: 'Admirar', desc: 'exact case' },
            { userInput: 'look up to', expectedDef: 'Admirar', desc: 'lowercase' },
            { userInput: 'Admirar', expectedDef: 'Admirar', desc: 'correct answer' },

            // Give up - Rendirse
            { userInput: 'Give up', expectedDef: 'Rendirse', desc: 'exact case' },
            { userInput: 'give up', expectedDef: 'Rendirse', desc: 'lowercase' },
            { userInput: 'Rendirse', expectedDef: 'Rendirse', desc: 'correct answer' },

            // Take off - Despegar
            { userInput: 'Take off', expectedDef: 'Despegar', desc: 'exact case' },
            { userInput: 'take off', expectedDef: 'Despegar', desc: 'lowercase' },
            { userInput: 'Despegar', expectedDef: 'Despegar', desc: 'correct answer' },

            // Run into - Encontrarse con
            { userInput: 'Run into', expectedDef: 'Encontrarse con', desc: 'exact case' },
            { userInput: 'run into', expectedDef: 'Encontrarse con', desc: 'lowercase' },
            { userInput: 'Encontrarse con', expectedDef: 'Encontrarse con', desc: 'correct answer' },

            // Put off - Posponer
            { userInput: 'Put off', expectedDef: 'Posponer', desc: 'exact case' },
            { userInput: 'put off', expectedDef: 'Posponer', desc: 'lowercase' },
            { userInput: 'Posponer', expectedDef: 'Posponer', desc: 'correct answer' },

            // Call off - Cancelar
            { userInput: 'Call off', expectedDef: 'Cancelar', desc: 'exact case' },
            { userInput: 'call off', expectedDef: 'Cancelar', desc: 'lowercase' },
            { userInput: 'Cancelar', expectedDef: 'Cancelar', desc: 'correct answer' },

            // Break down - Desglosar
            { userInput: 'Break down', expectedDef: 'Desglosar', desc: 'exact case' },
            { userInput: 'break down', expectedDef: 'Desglosar', desc: 'lowercase' },
            { userInput: 'Desglosar', expectedDef: 'Desglosar', desc: 'correct answer' },

            // Figure out - Descubrir
            { userInput: 'Figure out', expectedDef: 'Descubrir', desc: 'exact case' },
            { userInput: 'figure out', expectedDef: 'Descubrir', desc: 'lowercase' },
            { userInput: 'Descubrir', expectedDef: 'Descubrir', desc: 'correct answer' },
        ];

        testCases.forEach(({ userInput, expectedDef, desc }) => {
            it(`"${userInput}" vs "${expectedDef}" (${desc})`, () => {
                let game = GlimmindGame.create(list);
                
                // Find the card with this definition in the shuffled queue
                const cardId = associations.find(a => a.definition === expectedDef)?.id;
                if (!cardId) {
                    throw new Error(`Card with definition "${expectedDef}" not found`);
                }
                
                // Find the index in the active queue
                const cardIndex = game.state.activeQueue.indexOf(cardId);
                
                // Advance to the correct card
                for (let i = 0; i < cardIndex; i++) {
                    game = game.processAction({ type: 'PASS' });
                }
                
                game = game.setUserInput(userInput);
                game = game.checkAnswer();
                
                console.log(`"${userInput}" vs "${expectedDef}": similarity = ${game.state.similarity}%, feedback = ${game.state.feedback}, threshold = ${list.settings.threshold * 100}%`);
                
                // Expected: 100% if exact match (case-insensitive), low % if different languages
                if (userInput.toLowerCase() === expectedDef.toLowerCase()) {
                    expect(game.state.similarity).toBe(100);
                    expect(game.state.feedback).toBe('correct');
                }
            });
        });
    });
    describe('Game Completion and Cycle Progression Logic (Real Mode)', () => {
        it('Case 1: All Correct in the First Pass', () => {
            // Se presenta la primera carta: Pendientes 10, Correctas 0
            const list = createMockList(createMockAssociations(10));
            let game = GlimmindGame.create(list);
            
            expect(game.state.activeQueue.length).toBe(10);
            
            // Responder las 10 correctamente
            for (let i = 0; i < 10; i++) {
                const currentCardId = game.state.activeQueue[game.state.currentIndex];
                const card = game.state.associations.find(a => a.id === currentCardId)!;
                
                game = game.setUserInput(card.definition);
                game = game.checkAnswer();
                expect(game.state.feedback).toBe('correct');
                
                game = game.processAction({ type: 'CORRECT' });
            }
            
            // Resultado: Como Pendientes llega a 0 y no hay cartas encoladas, finalizado.
            expect(game.state.isFinished).toBe(true);
            const correctCount = game.state.associations.filter(a => a.status === 'correct').length;
            expect(correctCount).toBe(10);
        });

        it('Case 2: Mixed Correct and Incorrect Answers', () => {
            const list = createMockList(createMockAssociations(10));
            let game = GlimmindGame.create(list);
            
            // 5 correctas consecutivas
            for (let i = 0; i < 5; i++) {
                const currentCardId = game.state.activeQueue[game.state.currentIndex];
                const card = game.state.associations.find(a => a.id === currentCardId)!;
                game = game.setUserInput(card.definition);
                game = game.checkAnswer();
                game = game.processAction({ type: 'CORRECT' });
            }
            
            // 5 incorrectas consecutivas (pasamos a la siguiente con fallo)
            for (let i = 0; i < 5; i++) {
                const currentCardId = game.state.activeQueue[game.state.currentIndex];
                const card = game.state.associations.find(a => a.id === currentCardId)!;
                game = game.setUserInput('wrong answer');
                game = game.checkAnswer();
                game = game.processAction({ type: 'PASS' });
            }
            
            // Debería arrancar el Ciclo 2 con 5 cartas pendientes (las que fallamos)
            expect(game.state.isFinished).toBe(false);
            expect(game.state.globalCycle).toBe(2);
            expect(game.state.activeQueue.length).toBe(5);
            
            const correctCountCycle1 = game.state.associations.filter(a => a.status === 'correct').length;
            expect(correctCountCycle1).toBe(5); // 5 correctas del ciclo 1
            
            // Responder las 5 del ciclo 2 correctamente
            for (let i = 0; i < 5; i++) {
                const currentCardId = game.state.activeQueue[game.state.currentIndex];
                const card = game.state.associations.find(a => a.id === currentCardId)!;
                game = game.setUserInput(card.definition);
                game = game.checkAnswer();
                game = game.processAction({ type: 'CORRECT' });
            }
            
            // Finaliza
            expect(game.state.isFinished).toBe(true);
            const totalCorrect = game.state.associations.filter(a => a.status === 'correct').length;
            expect(totalCorrect).toBe(10);
        });
    });
});
