import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { GameView } from '../components/GameView';
import { GlimmindGame } from '../services/gameEngine';
import { AssociationList, Association } from '../types';

// Test data factory
const createTestList = (associations: Partial<Association>[] = []): AssociationList => ({
  id: 'test-list-1',
  userId: 'test-user',
  name: 'Test List',
  concept: 'Term / Definition',
  isArchived: false,
  settings: {
    mode: 'real',
    flipOrder: 'normal',
    threshold: 0.95,
  },
  associations: associations.map((a, i) => ({
    id: `assoc-${i}`,
    term: `Term ${i + 1}`,
    definition: `Definition ${i + 1}`,
    currentCycle: 1,
    status: 'pending' as const,
    isLearned: false,
    isArchived: false,
    ...a,
  })),
});

const createMockFunctions = () => ({
  onBack: vi.fn(),
  onUpdateAssociations: vi.fn().mockResolvedValue(undefined),
  onUpdateList: vi.fn().mockResolvedValue(undefined),
});

describe('Keyboard Shortcuts - Modo Examen (real)', () => {
  let mockFunctions: ReturnType<typeof createMockFunctions>;
  let testList: AssociationList;

  beforeEach(() => {
    mockFunctions = createMockFunctions();
    testList = createTestList([
      { term: 'hello', definition: 'hola' },
      { term: 'world', definition: 'mundo' },
    ]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Enter key in input field', () => {
    it('should validate answer when Enter is pressed in input field', async () => {
      render(<GameView list={testList} {...mockFunctions} />);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'hola' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockFunctions.onUpdateAssociations).toHaveBeenCalled();
    });

    it('should NOT validate answer when Enter is pressed without input', async () => {
      render(<GameView list={testList} {...mockFunctions} />);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      expect(mockFunctions.onUpdateAssociations).not.toHaveBeenCalled();
    });
  });

  describe('Space key when card is revealed', () => {
    it('should pass to next card when Space is pressed with revealed card', async () => {
      render(<GameView list={testList} {...mockFunctions} />);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // First, reveal the card (by clicking reveal or pressing Enter with wrong answer)
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: 'wrong' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Wait for incorrect feedback
      await waitFor(() => {
        expect(screen.getByText(/incorrect/i)).toBeInTheDocument();
      });

      // Now press Space to pass
      fireEvent.keyDown(document, { key: ' ', code: 'Space' });

      // Should move to next card or update state
      // The key indicator is that the input should be cleared or card changed
    });
  });

  describe('Tab key navigation', () => {
    it('should move focus from input to Validate button when Tab is pressed', async () => {
      render(<GameView list={testList} {...mockFunctions} />);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Tab', code: 'Tab' });

      // Focus should move to Validate button (or next focusable element)
      // This test verifies Tab doesn't cause validation
      expect(input).not.toHaveFocus();
    });
  });
});

describe('Keyboard Shortcuts - Modo Entrenamiento (training)', () => {
  let mockFunctions: ReturnType<typeof createMockFunctions>;
  let trainingList: AssociationList;

  beforeEach(() => {
    mockFunctions = createMockFunctions();
    trainingList = {
      ...createTestList([
        { term: 'hello', definition: 'hola' },
        { term: 'world', definition: 'mundo' },
      ]),
      settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
    };
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Enter or Space in training mode', () => {
    it('should reveal card when Enter is pressed in training mode', async () => {
      render(<GameView list={trainingList} {...mockFunctions} />);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // In training mode without input, Enter should reveal
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Card should be revealed (definition should be visible)
      await waitFor(() => {
        expect(screen.getByText(/hola/i)).toBeInTheDocument();
      });
    });

    it('should pass to next card when Space is pressed in training mode', async () => {
      render(<GameView list={trainingList} {...mockFunctions} />);
      
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });

      // Press Space to pass in training mode
      fireEvent.keyDown(document, { key: 'Space', code: 'Space' });

      // Should move to next card - verify by checking current index changed
      // or by checking that the term changed
    });
  });
});

describe('Toast Messages - Incorrect Attempt', () => {
  let mockFunctions: ReturnType<typeof createMockFunctions>;
  let testList: AssociationList;

  beforeEach(() => {
    mockFunctions = createMockFunctions();
    testList = createTestList([
      { term: 'hello', definition: 'hola' },
    ]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should display user input text in toast', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hla' } }); // typo
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Toast should show user input
    await waitFor(() => {
      expect(screen.getByText(/hla/i)).toBeInTheDocument();
    });
  });

  it('should display similarity percentage in toast', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hla' } }); // similar to 'hola'
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Toast should show similarity percentage (e.g., "75%")
    await waitFor(() => {
      expect(screen.getByText(/\d+%/)).toBeInTheDocument();
    });
  });

  it('should display threshold requirement in toast', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Toast should show threshold (95% based on settings)
    await waitFor(() => {
      expect(screen.getByText(/95|threshold/i)).toBeInTheDocument();
    });
  });

  it('should auto-clear input field after incorrect attempt', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'wrong' } });
    expect(input.value).toBe('wrong');

    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    });
  });
});

describe('Toast Messages - Correct Attempt', () => {
  let mockFunctions: ReturnType<typeof createMockFunctions>;
  let testList: AssociationList;

  beforeEach(() => {
    mockFunctions = createMockFunctions();
    testList = createTestList([
      { term: 'hello', definition: 'hola' },
      { term: 'world', definition: 'mundo' },
    ]);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should display expected text in success message', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Should show success message with correct answer
    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument();
    });
  });

  it('should display user input in success message', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // Toast or message should show what user typed
    await waitFor(() => {
      expect(screen.getByText(/hola/i)).toBeInTheDocument();
    });
  });

  it('should display 100% similarity on correct answer', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });
  });

  it('should auto-advance to next card after correct answer', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    // After auto-advance, should show next card term
    act(() => {
      vi.advanceTimersByTime(2000); // Wait for auto-advance
    });

    await waitFor(() => {
      expect(screen.getByText(/world|mundo/i)).toBeInTheDocument();
    });
  });
});

describe('Threshold Validation', () => {
  it('should accept answer above threshold (95%)', () => {
    const list = createTestList([{ term: 'hello', definition: 'hola' }]);
    list.settings.threshold = 0.95;
    
    const game = GlimmindGame.create(list);
    
    // "hola" should be correct
    const result = game.setUserInput('hola').checkAnswer();
    expect(result.state.feedback).toBe('correct');
  });

  it('should reject answer below threshold (75%)', () => {
    const list = createTestList([{ term: 'hello', definition: 'hola' }]);
    list.settings.threshold = 0.95;
    
    const game = GlimmindGame.create(list);
    
    // "hla" is 75% similar to "hola", should be incorrect if threshold is 95%
    const result = game.setUserInput('hla').checkAnswer();
    expect(result.state.feedback).toBe('incorrect');
  });

  it('should use threshold from list settings', () => {
    const list = createTestList([{ term: 'hello', definition: 'hola' }]);
    list.settings.threshold = 0.70; // 70% threshold
    
    const game = GlimmindGame.create(list);
    
    // "hla" is 75% similar, should be correct with 70% threshold
    const result = game.setUserInput('hla').checkAnswer();
    expect(result.state.feedback).toBe('correct');
  });

  it('should calculate and store similarity percentage', () => {
    const list = createTestList([{ term: 'hello', definition: 'hola' }]);
    
    const game = GlimmindGame.create(list);
    
    const result = game.setUserInput('hla').checkAnswer();
    expect(result.state.similarity).toBe(75);
  });
});

describe('Card Border Feedback', () => {
  let mockFunctions: ReturnType<typeof createMockFunctions>;
  let testList: AssociationList;

  beforeEach(() => {
    mockFunctions = createMockFunctions();
    testList = createTestList([
      { term: 'hello', definition: 'hola' },
    ]);
  });

  it('should show green border on correct answer', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      // Look for green/emerald class in the card container
      const card = screen.getByText(/hello/i).closest('div');
      expect(card?.className).toMatch(/emerald|green/i);
    });
  });

  it('should show red border on incorrect answer', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      // Look for red/rose class in the card container
      const card = screen.getByText(/hello/i).closest('div');
      expect(card?.className).toMatch(/rose|red/i);
    });
  });
});

describe('Button Functionality - Modo Examen', () => {
  let mockFunctions: ReturnType<typeof createMockFunctions>;
  let testList: AssociationList;

  beforeEach(() => {
    mockFunctions = createMockFunctions();
    testList = createTestList([
      { term: 'hello', definition: 'hola' },
      { term: 'world', definition: 'mundo' },
    ]);
  });

  it('should show "Pasar" button', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pasar|pass|next/i })).toBeInTheDocument();
    });
  });

  it('should show "Validar" button when not revealed', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /validar|validate/i })).toBeInTheDocument();
    });
  });

  it('should show "Revelar" button when input is empty', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /revelar|reveal/i })).toBeInTheDocument();
    });
  });

  it('should pass to next card when "Pasar" is clicked', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const passButton = screen.getByRole('button', { name: /pasar|pass|next/i });
    fireEvent.click(passButton);

    // Should move to next card or update state
    // The key indicator is that onUpdateAssociations was called
    await waitFor(() => {
      expect(mockFunctions.onUpdateAssociations).toHaveBeenCalled();
    });
  });

  it('should validate answer when "Validar" is clicked', async () => {
    render(<GameView list={testList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'hola' } });

    const validateButton = screen.getByRole('button', { name: /validar|validate/i });
    fireEvent.click(validateButton);

    expect(mockFunctions.onUpdateAssociations).toHaveBeenCalled();
  });
});

describe('Button Functionality - Modo Entrenamiento', () => {
  let mockFunctions: ReturnType<typeof createMockFunctions>;
  let trainingList: AssociationList;

  beforeEach(() => {
    mockFunctions = createMockFunctions();
    trainingList = {
      ...createTestList([
        { term: 'hello', definition: 'hola' },
        { term: 'world', definition: 'mundo' },
      ]),
      settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
    };
  });

  it('should show "Correcta" button in training mode', async () => {
    render(<GameView list={trainingList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /correcta|correct|right/i })).toBeInTheDocument();
    });
  });

  it('should NOT show "Validar" button in training mode', async () => {
    render(<GameView list={trainingList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /validar|validate/i })).not.toBeInTheDocument();
    });
  });

  it('should mark card as correct when "Correcta" is clicked', async () => {
    render(<GameView list={trainingList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /correcta|correct/i })).toBeInTheDocument();
    });

    const correctButton = screen.getByRole('button', { name: /correcta|correct/i });
    fireEvent.click(correctButton);

    await waitFor(() => {
      expect(mockFunctions.onUpdateAssociations).toHaveBeenCalled();
    });
  });

  it('should NOT show feedback messages in training mode', async () => {
    render(<GameView list={trainingList} {...mockFunctions} />);
    
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    // Mark as correct - should NOT show toast
    const correctButton = screen.getByRole('button', { name: /correcta|correct/i });
    fireEvent.click(correctButton);

    // Should NOT show any toast/feedback message
    await waitFor(() => {
      expect(screen.queryByText(/correcto|incorrecto|success|error/i)).not.toBeInTheDocument();
    });
  });
});
