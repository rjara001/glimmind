import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationScreen } from '../../../src/components/list-editor/ValidationScreen';
import type { ImportValidationResult } from '../../../src/services/importValidationService';

function makeResult(count: number): ImportValidationResult {
  return {
    total: count,
    counts: { existing: 0, similar: 0, new: count },
    categorized: Array.from({ length: count }, (_, i) => ({
      card: { term: `term-${i}`, definition: `def-${i}` },
      category: 'new' as const,
    })),
    existingTerms: new Set<string>(),
  };
}

interface RenderProps {
  importLimit?: number | null;
  count?: number;
}

function renderScreen({ importLimit = null, count = 30 }: RenderProps = {}) {
  const onConfirmImport = vi.fn().mockResolvedValue(undefined);
  const onBack = vi.fn();
  const showToast = vi.fn();
  render(
    <ValidationScreen
      validationResult={makeResult(count)}
      onConfirmImport={onConfirmImport}
      onBack={onBack}
      deckName="Test deck"
      showToast={showToast}
      isImporting={false}
      importLimit={importLimit}
    />,
  );
  return { onConfirmImport, onBack, showToast };
}

describe('ValidationScreen quota truncation', () => {
  it('shows the amber notice and "Se importarán Y de X" when selection exceeds the limit', () => {
    renderScreen({ importLimit: 20, count: 30 });

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent(/Tu límite es 20 tarjetas\./);
    expect(notice).toHaveTextContent(/las primeras 20/);
    expect(notice).toHaveTextContent(/las 10 restantes se descartan/);
    expect(screen.getByText('Se importarán 20 de 30')).toBeInTheDocument();
  });

  it('hides the notice and keeps the plain subtitle when the selection fits the limit', () => {
    renderScreen({ importLimit: 50, count: 30 });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('30 tarjetas seleccionadas')).toBeInTheDocument();
  });

  it('hides the notice when no importLimit is provided', () => {
    renderScreen({ importLimit: null, count: 30 });

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.getByText('30 tarjetas seleccionadas')).toBeInTheDocument();
  });

  it('still confirms the import when truncated', async () => {
    const { onConfirmImport } = renderScreen({ importLimit: 20, count: 30 });

    fireEvent.click(screen.getByText('📤 Agregar tarjetas'));

    expect(onConfirmImport).toHaveBeenCalledTimes(1);
  });
});
