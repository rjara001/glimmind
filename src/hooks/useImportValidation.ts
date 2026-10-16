import { useEffect, useMemo, useState } from 'react';
import type { Association } from '../types';
import type { AssociationList } from '../types';
import {
  validateImportCards,
  type ImportValidationResult,
} from '../services/importValidationService';

interface ImportValidationState {
  key: string;
  result: ImportValidationResult;
}

export function useImportValidation(
  cards: Association[],
  existingLists: AssociationList[] | undefined | null,
) {
  // Memoized checksum of existing lists for dependency tracking
  const checksum = useMemo(() => {
    return existingLists?.reduce((acc, list) => acc + list.associations.length, 0) ?? 0;
  }, [existingLists]);

  const validationKey = cards.length > 0 ? `${cards.length}:${checksum}` : null;

  const [state, setState] = useState<ImportValidationState | null>(null);

  useEffect(() => {
    if (!validationKey) {
      setState(null);
      return;
    }

    let cancelled = false;
    // Chunked async validation: results land in keyed state so a stale
    // result is never exposed for a different input set.
    validateImportCards(cards, existingLists ?? []).then((result) => {
      if (!cancelled) {
        setState({ key: validationKey, result });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [cards, existingLists, validationKey]);

  const isValidating = validationKey !== null && state?.key !== validationKey;
  const result =
    state && validationKey && state.key === validationKey ? state.result : null;

  return { result, isValidating };
}
