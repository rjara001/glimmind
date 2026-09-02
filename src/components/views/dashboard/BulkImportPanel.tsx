import type { ChangeEvent, RefObject } from "react";
import type { Association } from "../../../types";
import type { ImportTab } from "../../../hooks/dashboard/useDeckImporter";

interface BulkImportPanelProps {
  showBulk: boolean;
  importTab: ImportTab;
  setImportTab: (value: ImportTab) => void;
  bulkData: string;
  setBulkData: (value: string) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  isReadingFile: boolean;
  selectedFileName: string | null;
  fileAssociations: Association[];
  onChooseFile: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveUploadedFile: () => void;
}

export function BulkImportPanel({
  showBulk,
  importTab,
  setImportTab,
  bulkData,
  setBulkData,
  fileInputRef,
  isReadingFile,
  selectedFileName,
  fileAssociations,
  onChooseFile,
  onFileChange,
  onRemoveUploadedFile,
}: BulkImportPanelProps) {
  if (!showBulk) return null;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setImportTab("paste")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${importTab === "paste" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:text-indigo-600"}`}
        >
          Pegar
        </button>
        <button
          type="button"
          onClick={() => setImportTab("upload")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${importTab === "upload" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:text-indigo-600"}`}
        >
          Subir archivo
        </button>
      </div>

      {importTab === "paste" && (
        <>
          <p className="text-xs text-gray-400 mb-2">
            Pega tus datos aquí (Formato: Término, Definición). Puedes usar Tab, "," o ";".
          </p>
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="correr, run&#10;saltar, jump&#10;hablar, talk"
            className="w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm"
          />
        </>
      )}

      {importTab === "upload" && (
        <div className="flex flex-col items-center gap-2 py-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileChange}
          />
          <button
            type="button"
            onClick={onChooseFile}
            disabled={isReadingFile}
            className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {isReadingFile ? "Leyendo archivo..." : "Elegir archivo CSV"}
          </button>
          {selectedFileName && (
            <p className="text-xs font-semibold text-gray-600">Archivo: {selectedFileName}</p>
          )}
          {fileAssociations.length > 0 && (
            <div className="flex items-center gap-3">
              <p className="text-xs font-semibold text-emerald-600">
                {fileAssociations.length} tarjetas listas para crear
              </p>
              <button
                type="button"
                onClick={onRemoveUploadedFile}
                className="text-xs text-gray-500 hover:text-red-500 underline transition"
              >
                Quitar
              </button>
            </div>
          )}
          <p className="text-[10px] text-gray-400">
            Formato .csv con "Término, Definición" por línea. El encabezado se detecta y se ignora
            automáticamente.
          </p>
        </div>
      )}
    </div>
  );
}