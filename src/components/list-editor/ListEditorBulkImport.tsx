import React from "react";
import { BulkImport } from "./BulkImport";
import type { ExtractedKeyword, KeywordExtractionOptions } from "../../types/keyword-extraction";
import type { Association } from "../../types";

interface ListEditorBulkImportProps {
  onBulkAdd: (text: string) => void;
  onFileName?: (name: string) => void;

  // Keyword extraction
  extractText?: string;
  setExtractText?: (value: string) => void;
  extractedKeywords?: ExtractedKeyword[];
  selectedKeywords?: Set<string>;
  toggleKeyword?: (term: string) => void;
  selectAllKeywords?: () => void;
  clearSelection?: () => void;
  isExtracting?: boolean;
  runExtraction?: (options?: KeywordExtractionOptions) => Promise<void>;
  getSelectedAssociations?: () => Association[];
}

export const ListEditorBulkImport: React.FC<ListEditorBulkImportProps> = ({
  onBulkAdd,
  onFileName,
  extractText = "",
  setExtractText,
  extractedKeywords = [],
  selectedKeywords = new Set(),
  toggleKeyword,
  selectAllKeywords,
  clearSelection,
  isExtracting = false,
  runExtraction,
  getSelectedAssociations,
}) => {
  const hasExtraction = !!runExtraction;

  return <BulkImport
    onBulkAdd={onBulkAdd}
    onFileName={onFileName}
    extraction={hasExtraction ? {
      extractText,
      setExtractText: setExtractText ?? (() => {}),
      extractedKeywords,
      selectedKeywords,
      toggleKeyword: toggleKeyword ?? (() => {}),
      selectAllKeywords: selectAllKeywords ?? (() => {}),
      clearSelection: clearSelection ?? (() => {}),
      isExtracting,
      runExtraction: runExtraction ?? (async () => {}),
      getSelectedAssociations: getSelectedAssociations ?? (() => []),
    } : undefined}
  />;
};