import { useCallback, useRef, useState, type ChangeEvent, type RefObject } from "react";
import type { Association, FlashcardMetadata } from "../../types";
import type { ImportPreviewData } from "../../types/import-deck";
import type { ExtractedKeyword, KeywordExtractionOptions } from "../../types/keyword-extraction";
import { normalizeAssociations, type AssociationLike } from "../../utils/normalizeAssociation";
import { parseForPreview } from "../../utils/csv";
import { extractKeywordsLocal } from "../../services/localKeywordExtraction";

export type ImportTab = "paste" | "upload" | "extract";
export type { ExtractedKeyword, KeywordExtractionOptions } from "../../types/keyword-extraction";

export interface DeckImporterState {
  bulkData: string;
  setBulkData: (value: string) => void;
  parsedData: ImportPreviewData | null;
  showBulk: boolean;
  setShowBulk: (value: boolean) => void;
  importTab: ImportTab;
  setImportTab: (value: ImportTab) => void;
  selectedFileName: string | null;
  setSelectedFileName: (value: string | null) => void;
  isReadingFile: boolean;
  fileAssociations: Association[];
  setFileAssociations: (value: Association[]) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  parseBulkData: (text: string) => Association[];
  resetBulkInputs: () => void;
  removeUploadedFile: () => void;

  // Keyword extraction
  extractText: string;
  setExtractText: (value: string) => void;
  extractedKeywords: ExtractedKeyword[];
  setExtractedKeywords: (value: ExtractedKeyword[]) => void;
  selectedKeywords: Set<string>;
  toggleKeyword: (term: string) => void;
  selectAllKeywords: () => void;
  clearSelection: () => void;
  isExtracting: boolean;
  runExtraction: (options?: KeywordExtractionOptions) => Promise<void>;
  getSelectedAssociations: () => Association[];
}

export function useDeckImporter(
  onImportSuccess: (message: string) => void,
  onImportError: (message: string) => void,
  existingVocabulary?: string[],
): DeckImporterState {
  const [bulkData, setBulkDataState] = useState("");
  const [parsedData, setParsedData] = useState<ImportPreviewData | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [importTab, setImportTab] = useState<ImportTab>("paste");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileAssociations, setFileAssociations] = useState<Association[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keyword extraction state
  const [extractText, setExtractTextState] = useState("");
  const [extractedKeywords, setExtractedKeywordsState] = useState<ExtractedKeyword[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [isExtracting, setIsExtracting] = useState(false);

  const setBulkData = useCallback((value: string) => {
    setBulkDataState(value);
    setParsedData(parseForPreview(value));
  }, []);

  const setExtractText = useCallback((value: string) => {
    setExtractTextState(value);
    // Auto-extract on every change (like paste tab)
    if (value.trim().length >= 50) {
      setIsExtracting(true);
      extractKeywordsLocal(value, { existingVocabulary: existingVocabulary ?? [] })
        .then(result => {
          setExtractedKeywordsState(result.keywords);
          setSelectedKeywords(new Set(result.keywords.map(k => k.term)));
        })
        .catch(console.error)
        .finally(() => setIsExtracting(false));
    } else {
      setExtractedKeywordsState([]);
      setSelectedKeywords(new Set());
    }
  }, [existingVocabulary]);

  const setExtractedKeywords = useCallback((value: ExtractedKeyword[]) => {
    setExtractedKeywordsState(value);
  }, []);

  const toggleKeyword = useCallback((term: string) => {
    setSelectedKeywords(prev => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  }, []);

  const selectAllKeywords = useCallback(() => {
    setSelectedKeywords(new Set(extractedKeywords.map(k => k.term)));
  }, [extractedKeywords]);

  const clearSelection = useCallback(() => {
    setSelectedKeywords(new Set());
  }, []);

  const runExtraction = useCallback(async (options?: KeywordExtractionOptions) => {
    const text = extractText.trim();
    if (!text) return;

    setIsExtracting(true);
    try {
      const mergedOptions: KeywordExtractionOptions = {
        ...options,
        existingVocabulary: existingVocabulary ?? [],
      };
      const result = await extractKeywordsLocal(text, mergedOptions);
      setExtractedKeywordsState(result.keywords);
      setSelectedKeywords(new Set(result.keywords.map(k => k.term)));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al extraer keywords";
      onImportError(message);
    } finally {
      setIsExtracting(false);
    }
  }, [extractText, onImportError, existingVocabulary]);

  const getSelectedAssociations = useCallback((): Association[] => {
    return extractedKeywords
      .filter(kw => selectedKeywords.has(kw.term))
      .map(kw => ({
        id: crypto.randomUUID(),
        term: kw.term,
        definition: [''],
        translation: undefined,
        context: kw.context,
        metadata: { difficulty: 'intermediate' as const, frequencyRank: 0, tags: ['auto-extracted'] } satisfies FlashcardMetadata,
        currentCycle: 1,
        status: 'pending' as const,
        isLearned: false,
        isArchived: false,
      }));
  }, [extractedKeywords, selectedKeywords]);

  const parseBulkData = useCallback((text: string): Association[] => {
    const preview = parseForPreview(text);
    const associations: AssociationLike[] = preview.rows.map((triple) => ({
      id: crypto.randomUUID(),
      term: triple.value1,
      definition: triple.value2,
      context: triple.context,
      currentCycle: 1,
      status: "pending" as const,
      isLearned: false,
      isArchived: false,
    }));
    return normalizeAssociations(associations);
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      setSelectedFileName(file.name);
      setIsReadingFile(true);
      try {
        const content = await file.text();
        const preview = parseForPreview(content);
        setParsedData(preview);

        if (preview.rows.length === 0) {
          onImportError("El archivo no contiene tarjetas válidas.");
          return;
        }

        const associations: Association[] = normalizeAssociations(
          preview.rows.map<AssociationLike>((triple) => ({
            id: crypto.randomUUID(),
            term: triple.value1,
            definition: triple.value2,
            context: triple.context,
            currentCycle: 1,
            status: "pending" as const,
            isLearned: false,
            isArchived: false,
          })),
        );

        setFileAssociations(associations);
        onImportSuccess(`Se importaron ${associations.length} tarjetas de "${file.name}"`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo leer el archivo.";
        onImportError(`No se pudo importar el archivo: ${message}`);
      } finally {
        setIsReadingFile(false);
        if (event.target) {
          event.target.value = "";
        }
      }
    },
    [onImportError, onImportSuccess],
  );

  const resetBulkInputs = useCallback(() => {
    setBulkDataState("");
    setParsedData(null);
    setFileAssociations([]);
    setSelectedFileName(null);
  }, []);

  const removeUploadedFile = useCallback(() => {
    setFileAssociations([]);
    setSelectedFileName(null);
  }, []);

  return {
    bulkData,
    setBulkData,
    parsedData,
    showBulk,
    setShowBulk,
    importTab,
    setImportTab,
    selectedFileName,
    setSelectedFileName,
    isReadingFile,
    fileAssociations,
    setFileAssociations,
    fileInputRef,
    handleFileChange,
    parseBulkData,
    resetBulkInputs,
    removeUploadedFile,

    // Keyword extraction
    extractText,
    setExtractText,
    extractedKeywords,
    setExtractedKeywords,
    selectedKeywords,
    toggleKeyword,
    selectAllKeywords,
    clearSelection,
    isExtracting,
    runExtraction,
    getSelectedAssociations,
  };
}