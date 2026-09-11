import { useMemo } from 'react';
import type { Association } from '../types';
import type { AssociationList } from '../types';
import { validateImportCards } from '../services/importValidationService';

export function useImportValidation(
  cards: Association[],
  existingLists: AssociationList[] | undefined | null,
) {
  // Memoized checksum of existing lists for dependency tracking
  const checksum = useMemo(() => {
    return existingLists?.reduce((acc, list) => acc + list.associations.length, 0) ?? 0;
  }, [existingLists]);

  const result = useMemo(() => {
    if (!cards.length) return null;
    return validateImportCards(cards, existingLists ?? []);
  }, [cards.length, checksum]);

  return { result, isValidating: !!result };
}