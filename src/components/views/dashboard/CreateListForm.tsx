import type { FormEvent } from "react";
import type { Association } from "../../../types";
import type { ImportPreviewData } from "../../../types/import-deck";
import type { ImportTab } from "../../../hooks/dashboard/useDeckImporter";
import type { RefObject } from "react";
import { BulkImportPanel } from "./BulkImportPanel";

interface CreateListFormProps {
  newName: string;
  setNewName: (value: string) => void;
  newConcept: string;
  setNewConcept: (value: string) => void;
  showBulk: boolean;
  setShowBulk: (value: boolean) => void;
  importTab: ImportTab;
  setImportTab: (value: ImportTab) => void;
  bulkData: string;
  setBulkData: (value: string) => void;
  parsedData: ImportPreviewData | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isReadingFile: boolean;
  selectedFileName: string | null;
  fileAssociations: Association[];
  onChooseFile: () => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveUploadedFile: () => void;
  onCancel: () => void;
  onSubmit: (e: FormEvent) => void;
}

export function CreateListForm({
  newName,
  setNewName,
  newConcept,
  setNewConcept,
  showBulk,
  setShowBulk,
  importTab,
  setImportTab,
  bulkData,
  setBulkData,
  parsedData,
  fileInputRef,
  isReadingFile,
  selectedFileName,
  fileAssociations,
  onChooseFile,
  onFileChange,
  onRemoveUploadedFile,
  onCancel,
  onSubmit,
}: CreateListFormProps) {
  return (
    <div className="mb-8 bg-white p-6 rounded-xl border border-indigo-100 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Lista</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="ej: Verbos Irregulares"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Concepto (Par)</label>
            <input
              type="text"
              value={newConcept}
              onChange={(e) => setNewConcept(e.target.value)}
              placeholder="ej: Inglés / Español"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition"
              required
            />
          </div>
        </div>

        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowBulk(!showBulk)}
            className="text-indigo-600 text-sm font-semibold flex items-center gap-1 hover:underline mb-2"
          >
            {showBulk ? "− Quitar datos masivos" : "+ Pegar lista CSV / Excel ahora"}
          </button>

          <BulkImportPanel
            showBulk={showBulk}
            importTab={importTab}
            setImportTab={setImportTab}
            bulkData={bulkData}
            setBulkData={setBulkData}
            parsedData={parsedData}
            fileInputRef={fileInputRef}
            isReadingFile={isReadingFile}
            selectedFileName={selectedFileName}
            fileAssociations={fileAssociations}
            onChooseFile={onChooseFile}
            onFileChange={onFileChange}
            onRemoveUploadedFile={onRemoveUploadedFile}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md"
          >
            Crear y Empezar
          </button>
        </div>
      </form>
    </div>
  );
}