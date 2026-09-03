import type { ChangeEvent, RefObject } from "react";
import type { Association } from "../../../types";
import type { ImportPreviewData } from "../../../types/import-deck";
import type { ImportTab } from "../../../hooks/dashboard/useDeckImporter";
import { MAX_PREVIEW_ROWS, renderMappingBadge, renderPreviewTable } from "../../../utils/importPreview";

interface BulkImportPanelProps {
  showBulk: boolean;
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
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveUploadedFile: () => void;
}

export function BulkImportPanel({
  showBulk,
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
}: BulkImportPanelProps) {
  if (!showBulk) return null;

  const showPreview = importTab === "paste" || (parsedData !== null && parsedData.rows.length > 0);
  const hasParsedData = parsedData !== null && (parsedData.rows.length > 0 || parsedData.hasHeader);
  const hasText = bulkData.trim().length > 0;

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
            Pega tus datos aquí (Formato: Value1, Value2, Contexto). Puedes usar Tab, "," o ";".
            Las primeras 3 columnas se toman en orden estricto.
          </p>
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="Abandon,Abandonar,They had to abandon the project&#10;Absolutely,Absolutamente,This is crucial for scaling"
            className="w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm resize-y"
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
            Formato .csv con columnas Value1, Value2, Contexto. El encabezado se detecta y se ignora
            automáticamente.
          </p>
        </div>
      )}

      {showPreview && (
        <>
          {hasParsedData ? (
            <div
              className="mapping-badge-preview mt-3 mb-2"
              dangerouslySetInnerHTML={{ __html: renderMappingBadge(parsedData) }}
            />
          ) : (
            <div
              className="mt-3 mb-2 text-xs text-gray-400"
              dangerouslySetInnerHTML={{
                __html: !hasText
                  ? '<span class="flex items-center gap-1">📋 Pega tu texto para ver la vista previa</span>'
                  : '<span class="flex items-center gap-1">📋 No se detectaron datos</span>',
              }}
            />
          )}

          {hasParsedData && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 bg-gray-50/50">
              <div
                className="overflow-y-auto max-h-[320px]"
                dangerouslySetInnerHTML={{ __html: renderPreviewTable(parsedData) }}
              />
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-xs text-gray-500">
            <span>
              📊 <span className="font-semibold text-gray-700">{parsedData?.rows.length ?? 0}</span> filas detectadas
              {parsedData && parsedData.rows.length > MAX_PREVIEW_ROWS &&
                ` (mostrando primeras ${MAX_PREVIEW_ROWS})`}
            </span>
            <button
              type="button"
              onClick={() => setBulkData("")}
              className="text-xs text-gray-500 hover:text-red-500 underline transition"
            >
              🗑️ Limpiar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
