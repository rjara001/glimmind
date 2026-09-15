import type { Association, AssociationList } from '../types';
import type { AIGroupSuggestion } from '../services/aiService';
import type { ImportValidationResult } from '../services/importValidationService';
import type { QuotaStatus } from '../types/quota';
import type { UserQuota } from '../types/quota';

export interface TableSort {
  field: 'term' | 'definition';
  direction: 'asc' | 'desc';
}

export interface ListEditorState {
  editList: AssociationList;
  searchTerm: string;
  activeSort: TableSort | null;
  archivedSort: TableSort | null;
  selectedIds: Set<string>;
  selectedArchivedIds: Set<string>;
  isTranslating: boolean;
  translateLang: string;
  activeTagFilter: string | null;
  isSaving: boolean;
  showBulk: boolean;
  showImportModal: boolean;
  validationResult: ImportValidationResult | null;
  showValidationScreen: boolean;
  nameError: boolean;
  aiSuggestions: AIGroupSuggestion[] | null;
}

export interface ListEditorActions {
  onSave: (list: AssociationList) => Promise<void>;
  onBack: () => void;
  onCreateMultiple: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
}

export interface UseListEditorActionsParams {
  editList: AssociationList;
  setEditList: React.Dispatch<React.SetStateAction<AssociationList>>;
  selectedIds: Set<string>;
  selectedArchivedIds: Set<string>;
  onSave: (list: AssociationList) => Promise<void>;
  onCreateMultiple: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  translateLang: string;
  quota: UserQuota | null;
  lists: AssociationList[];
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setNameError: React.Dispatch<React.SetStateAction<boolean>>;
  setShowBulk: React.Dispatch<React.SetStateAction<boolean>>;
  setShowImportModal: React.Dispatch<React.SetStateAction<boolean>>;
  setValidationResult: React.Dispatch<React.SetStateAction<ImportValidationResult | null>>;
  setShowValidationScreen: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface ListEditorQuotaData {
  quotaStatus: QuotaStatus | null;
  translationUsed: number;
  translationLimit: number;
  translationPercentage: number;
  translationState: 'ok' | 'warning' | 'blocked';
  uniqueTags: string[];
  activeAssociations: Association[];
  archivedAssociations: Association[];
  filteredActive: Association[];
  filteredArchived: Association[];
  sortedActive: Association[];
  sortedArchived: Association[];
}

export interface ListEditorProps {
  list: AssociationList;
  initialEditId?: string | null;
  onInitialEditConsumed?: () => void;
  onSave: (list: AssociationList) => Promise<void> | void;
  onBack: () => void;
  onBackLabel?: string;
  onCreateMultiple?: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
}