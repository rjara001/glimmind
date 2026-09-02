import { useCallback, useRef, useState, type ChangeEvent, type RefObject } from "react";
import type { Association } from "../../types";
import { normalizeAssociations, type AssociationLike } from "../../utils/normalizeAssociation";
import { parseCsvPairs, isHeaderPair } from "../../utils/csv";

export type ImportTab = "paste" | "upload";

export interface DeckImporterState {
  bulkData: string;
  setBulkData: (value: string) => void;
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
  newConcept: string,
  onImportSuccess: (message: string) => void,
  onImportError: (message: string) => void,
): DeckImporterState {
  const [bulkData, setBulkData] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [importTab, setImportTab] = useState<ImportTab>("paste");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [fileAssociations, setFileAssociations] = useState<Association[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseBulkData = useCallback((text: string): Association[] => {
    const pairs = parseCsvPairs(text);
    const associations: AssociationLike[] = pairs.map((pair) => ({
      id: crypto.randomUUID(),
      term: pair.term,
      definition: pair.definition,
      currentCycle: 1,
      status: "pending",
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
        const pairs = parseCsvPairs(content);
        const conceptParts = newConcept.split("/");
        const skippedHeader =
          pairs.length > 0 &&
          isHeaderPair(pairs[0], conceptParts[0] || "", conceptParts[1] || "");
        const dataPairs = skippedHeader ? pairs.slice(1) : pairs;

        if (dataPairs.length === 0) {
          onImportError("El archivo no contiene tarjetas válidas.");
          return;
        }

        const associations: Association[] = normalizeAssociations(
          dataPairs.map<AssociationLike>((pair) => ({
            id: crypto.randomUUID(),
            term: pair.term,
            definition: pair.definition,
            currentCycle: 1,
            status: "pending",
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
    [newConcept, onImportError, onImportSuccess],
  );

  const resetBulkInputs = useCallback(() => {
    setBulkData("");
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