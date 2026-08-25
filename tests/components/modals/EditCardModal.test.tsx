import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditCardModal } from '@/components/modals/EditCardModal';

const defaultProps = {
  labelTerm: 'Term',
  labelDef: 'Definition',
  initialTerm: 'Word',
  initialDef: 'it pays',
  voiceTermLang: 'en',
  voiceDefLang: 'es',
  onSave: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
};

describe('EditCardModal', () => {
  it('renders term and definition inputs with initial values', () => {
    render(<EditCardModal {...defaultProps} />);

    expect(screen.getByDisplayValue('Word')).toBeInTheDocument();
    expect(screen.getByDisplayValue('it pays')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Editar tarjeta' })).toBeInTheDocument();
  });

  it('calls onSave with edited values when Guardar is clicked', () => {
    const onSave = vi.fn();
    render(<EditCardModal {...defaultProps} onSave={onSave} />);

    fireEvent.change(screen.getByDisplayValue('Word'), { target: { value: 'Changed' } });
    fireEvent.click(screen.getByText('Guardar'));

    expect(onSave).toHaveBeenCalledWith('Changed', 'it pays');
  });

  it('calls onSave when pressing Enter in an input', () => {
    const onSave = vi.fn();
    render(<EditCardModal {...defaultProps} onSave={onSave} />);

    fireEvent.keyDown(screen.getByDisplayValue('Word'), { key: 'Enter' });

    expect(onSave).toHaveBeenCalledWith('Word', 'it pays');
  });

  it('calls onClose when Cancelar is clicked', () => {
    const onClose = vi.fn();
    render(<EditCardModal {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByText('Cancelar'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<EditCardModal {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(screen.getByDisplayValue('Word'), { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when the delete button is clicked', () => {
    const onDelete = vi.fn();
    render(<EditCardModal {...defaultProps} onDelete={onDelete} />);

    fireEvent.click(screen.getByLabelText('Eliminar tarjeta'));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('does not call onSave or onClose when clicking inside the dialog content', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<EditCardModal {...defaultProps} onSave={onSave} onClose={onClose} />);

    fireEvent.click(screen.getByRole('dialog', { name: 'Editar tarjeta' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
