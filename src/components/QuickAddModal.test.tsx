import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickAddModal } from './modals/QuickAddModal';
import { AssociationList } from '../types';

const createList = (
  id: string,
  name: string,
  concept: string,
  terms: string[],
): AssociationList => ({
  id,
  userId: 'user1',
  name,
  concept,
  associations: terms.map((term, i) => ({
    id: `${id}-${i}`,
    term,
    definition: `def ${i}`,
    currentCycle: 1,
    status: 'pending',
    isLearned: false,
    isArchived: false,
  })),
  isArchived: false,
  settings: { mode: 'training', flipOrder: 'normal', threshold: 0.95 },
});

const lists = [
  createList('verbs', 'Verbos', 'Verbos', ['eat', 'run']),
  createList('colors', 'Colores', 'Colores', ['red', 'blue']),
];

describe('QuickAddModal', () => {
  const onAdd = vi.fn();
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows autocomplete results matching the query across lists', () => {
    render(<QuickAddModal lists={lists} onAdd={onAdd} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Buscar valor'), { target: { value: 'run' } });

    expect(screen.getByText('run')).toBeInTheDocument();
    expect(screen.getByText('Verbos')).toBeInTheDocument();
  });

  it('detects that a value already exists in a list when selected', () => {
    render(<QuickAddModal lists={lists} onAdd={onAdd} onClose={onClose} />);

    fireEvent.change(screen.getByLabelText('Buscar valor'), { target: { value: 'red' } });
    fireEvent.click(screen.getByText('red'));

    expect(screen.getByText(/Ya existe en la lista/)).toBeInTheDocument();
  });

  it('creates a new value and calls onAdd with the selected list', () => {
    render(<QuickAddModal lists={lists} onAdd={onAdd} onClose={onClose} />);

    fireEvent.click(screen.getByText('No lo encuentro, crear nuevo'));

    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: 'go' } });
    fireEvent.change(screen.getByLabelText('Esperado'), { target: { value: 'ir' } });

    fireEvent.click(screen.getByText('Agregar valor'));

    expect(onAdd).toHaveBeenCalledWith('verbs', 'go', 'ir');
  });
});
