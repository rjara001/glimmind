import type { ChangeEvent, RefObject } from "react";
import type { Association } from "../../../types";
import type { ImportPreviewData } from "../../../types/import-deck";
import type { ImportTab, ExtractedKeyword, KeywordExtractionOptions } from "../../../hooks/dashboard/useDeckImporter";
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

  // Keyword extraction
  extractText: string;
  setExtractText: (value: string) => void;
  extractedKeywords: ExtractedKeyword[];
  selectedKeywords: Set<string>;
  toggleKeyword: (term: string) => void;
  selectAllKeywords: () => void;
  clearSelection: () => void;
  isExtracting: boolean;
  runExtraction: (options?: KeywordExtractionOptions) => Promise<void>;
  getSelectedAssociations: () => Association[];
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
  extractText,
  setExtractText,
  extractedKeywords,
  selectedKeywords,
  toggleKeyword,
  selectAllKeywords,
  clearSelection,
  isExtracting,
  runExtraction,
  getSelectedAssociations,
}: BulkImportPanelProps) {
  if (!showBulk) return null;

  const showPreview = importTab === "paste" || importTab === "extract" || (parsedData !== null && parsedData.rows.length > 0);
  const hasParsedData = parsedData !== null && (parsedData.rows.length > 0 || parsedData.hasHeader);
  const hasText = bulkData.trim().length > 0;
  const hasExtractedKeywords = extractedKeywords.length > 0;
  const hasSelectedKeywords = selectedKeywords.size > 0;

  return (
    <div className="animate-in fade-in zoom-in-95 duration-200">
      <div className="flex gap-2 mb-3">
        <button
          type="button"
          onClick={() => setImportTab("paste")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
            importTab === "paste" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:text-indigo-600"
          }`}
        >
          Pegar
        </button>
        <button
          type="button"
          onClick={() => setImportTab("upload")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
            importTab === "upload" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:text-indigo-600"
          }`}
        >
          Subir archivo
        </button>
        <button
          type="button"
          onClick={() => setImportTab("extract")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
            importTab === "extract" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:text-indigo-600"
          }`}
        >
          Vocabulario
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

      {importTab === "extract" && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-gray-400 mb-1">
            Pega un texto largo (artículo, capítulo, transcripción, letra de canción) para extraer vocabulario y expresiones.
          </p>
          <textarea
            value={extractText}
            onChange={(e) => setExtractText(e.target.value)}
            placeholder="Pega aquí un texto en español o inglés (mín. 50 caracteres, 3+ oraciones)..."
            className="w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm resize-y"
            rows={6}
          />
          <div className="flex items-center gap-2">
            {isExtracting && (
              <span className="flex items-center gap-1.5 text-xs text-indigo-600">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analizando...
              </span>
            )}
            {hasExtractedKeywords && !isExtracting && (
              <button
                type="button"
                onClick={() => runExtraction()}
                className="text-xs text-indigo-600 hover:underline"
              >
                Re-analizar
              </button>
            )}
            {hasExtractedKeywords && (
              <>
                <button
                  type="button"
                  onClick={selectAllKeywords}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Seleccionar todo
                </button>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Limpiar selección
                </button>
              </>
            )}
          </div>

          {hasExtractedKeywords && (
            <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-gray-50/50 p-2 space-y-1">
              {extractedKeywords.map((kw) => (
                <label key={kw.term} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedKeywords.has(kw.term)}
                    onChange={() => toggleKeyword(kw.term)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="font-mono text-sm text-gray-700 group-hover:text-indigo-600">
                    {kw.term}
                  </span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                    {kw.type === "phrase" ? "EXPRESIÓN" : "PALABRA"}
                  </span>
                  <span className="text-xs text-gray-400 flex-1 truncate">{kw.context}</span>
                  <span className="text-xs text-emerald-600 font-mono">{kw.score.toFixed(3)}</span>
                </label>
              ))}
            </div>
          )}

          {hasSelectedKeywords && (
            <div className="flex items-center justify-between px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              <span>
                ✓ <span className="font-semibold">{selectedKeywords.size}</span> candidatos seleccionados
              </span>
              <span className="text-emerald-600">
                → {getSelectedAssociations().length} tarjetas se crearán
              </span>
            </div>
          )}
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
                __html: !hasText && importTab !== "extract"
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