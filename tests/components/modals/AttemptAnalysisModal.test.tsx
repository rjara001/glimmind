import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AttemptAnalysisModal } from '@/components/modals/AttemptAnalysisModal';
import { AssociationList } from '@/types';

const createMockList = (settings?: Partial<AssociationList['settings']>): AssociationList => ({
  id: 'list1',
  userId: 'user1',
  name: 'Test List',
  concept: 'Term/Def',
  associations: [],
  isArchived: false,
  settings: {
    mode: 'real',
    flipOrder: 'normal',
    threshold: 0.95,
    ignoreArticles: true,
    ...settings,
  },
});

const createAttempt = (overrides?: Partial<import('@/types').Attempt>): import('@/types').Attempt => ({
  userInput: 'if we lived in the mountain',
  similarity: 90,
  threshold: 95,
  expectedAnswer: 'If we lived in the montains',
  timestamp: Date.now(),
  associationId: 'assoc1',
  ...overrides,
});

describe('AttemptAnalysisModal', () => {
  it('does not render when closed', () => {
    render(
      <AttemptAnalysisModal
        isOpen={false}
        onClose={() => {}}
        attempt={createAttempt()}
        list={createMockList()}
        onUpdateExpectedAnswer={() => {}}
      />,
    );

    expect(screen.queryByText('¿Por qué 90%?')).not.toBeInTheDocument();
  });

  it('renders similarity analysis when open', () => {
    render(
      <AttemptAnalysisModal
        isOpen={true}
        onClose={() => {}}
        attempt={createAttempt()}
        list={createMockList()}
        onUpdateExpectedAnswer={() => {}}
      />,
    );

    expect(screen.getByText('¿Por qué 90%?')).toBeInTheDocument();
    expect(screen.getByText('📊 Desglose del puntaje')).toBeInTheDocument();
    expect(screen.getByText('🔬 Comparación carácter por carácter')).toBeInTheDocument();
  });

  it('shows typo alert for high similarity with small distance', () => {
    render(
      <AttemptAnalysisModal
        isOpen={true}
        onClose={() => {}}
        attempt={createAttempt({ userInput: 'mountain', expectedAnswer: 'montains', similarity: 90, threshold: 95 })}
        list={createMockList({ ignoreArticles: false })}
        onUpdateExpectedAnswer={() => {}}
      />,
    );

    expect(screen.getByText(/La respuesta esperada parece tener un typo/)).toBeInTheDocument();
  });

  it('does not show typo alert when similarity is too low', () => {
    render(
      <AttemptAnalysisModal
        isOpen={true}
        onClose={() => {}}
        attempt={createAttempt({ userInput: 'completamente diferente', expectedAnswer: 'otra cosa', similarity: 30, threshold: 95 })}
        list={createMockList()}
        onUpdateExpectedAnswer={() => {}}
      />,
    );

    expect(screen.queryByText(/La respuesta esperada parece tener un typo/)).not.toBeInTheDocument();
  });

  it('opens fix form when clicking fix button', () => {
    render(
      <AttemptAnalysisModal
        isOpen={true}
        onClose={() => {}}
        attempt={createAttempt()}
        list={createMockList()}
        onUpdateExpectedAnswer={() => {}}
      />,
    );

    fireEvent.click(screen.getByText('Corregir respuesta esperada'));
    expect(screen.getByText('Guardar corrección')).toBeInTheDocument();
    expect(screen.getByDisplayValue('if we lived in the mountain')).toBeInTheDocument();
  });

  it('calls onUpdateExpectedAnswer with correct field when submitting fix', async () => {
    const onUpdateExpectedAnswer = vi.fn();
    render(
      <AttemptAnalysisModal
        isOpen={true}
        onClose={() => {}}
        attempt={createAttempt({ associationId: 'assoc1' })}
        list={createMockList({ flipOrder: 'normal' })}
        onUpdateExpectedAnswer={onUpdateExpectedAnswer}
      />,
    );

    fireEvent.click(screen.getByText('Corregir respuesta esperada'));
    const input = screen.getByDisplayValue('if we lived in the mountain');
    fireEvent.change(input, { target: { value: 'if we lived in the mountain corrected' } });
    fireEvent.click(screen.getByText('Guardar corrección'));

    expect(onUpdateExpectedAnswer).toHaveBeenCalledWith('assoc1', 'definition', 'if we lived in the mountain corrected');
  });

  it('updates term field when flipOrder is reversed', async () => {
    const onUpdateExpectedAnswer = vi.fn();
    render(
      <AttemptAnalysisModal
        isOpen={true}
        onClose={() => {}}
        attempt={createAttempt({ associationId: 'assoc1' })}
        list={createMockList({ flipOrder: 'reversed' })}
        onUpdateExpectedAnswer={onUpdateExpectedAnswer}
      />,
    );

    fireEvent.click(screen.getByText('Corregir respuesta esperada'));
    const input = screen.getByDisplayValue('if we lived in the mountain');
    fireEvent.change(input, { target: { value: 'if we lived in the mountain corrected' } });
    fireEvent.click(screen.getByText('Guardar corrección'));

    expect(onUpdateExpectedAnswer).toHaveBeenCalledWith('assoc1', 'term', 'if we lived in the mountain corrected');
  });
});
