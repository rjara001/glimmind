import { useCallback, useRef, useState, type ChangeEvent, type RefObject } from "react";
import type { Association } from "../../types";
import type { ImportPreviewData } from "../../types/import-deck";
import { normalizeAssociations, type AssociationLike } from "../../utils/normalizeAssociation";
import { parseForPreview } from "../../utils/csv";

export type ImportTab = "paste" | "upload";

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
}

export function useDeckImporter(
  onImportSuccess: (message: string) => void,
  onImportError: (message: string) => void,
): DeckImporterState {
  const [bulkData, setBulkDataState] = useState("");
  const [parsedData, setParsedData] = useState<ImportPreviewData | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [importTab, setImportTab] = useState<ImportTab>("paste");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileAssociations, setFileAssociations] = useState<Association[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setBulkData = useCallback((value: string) => {
    setBulkDataState(value);
    setParsedData(parseForPreview(value));
  }, []);

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
  };
}