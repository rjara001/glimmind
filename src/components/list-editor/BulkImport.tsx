import React, { useState, useRef, useCallback } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { ImportPreviewData } from '../../types/import-deck';
import { parseForPreview, MAX_PREVIEW_ROWS } from '../../utils/csv';
import { renderMappingBadge, renderPreviewTable } from '../../utils/importPreview';

interface BulkImportProps {
  onBulkAdd: (text: string) => void;
}

export const BulkImport: React.FC<BulkImportProps> = ({
  onBulkAdd,
}) => {
  const [bulkText, setBulkText] = useState('');
  const [parsedData, setParsedData] = useState<ImportPreviewData | null>(null);
  const [importTab, setImportTab] = useState<'paste' | 'upload'>('paste');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBulkTextChange = useCallback((value: string) => {
    setBulkText(value);
    setParsedData(parseForPreview(value));
  }, []);

  const handleClear = useCallback(() => {
    setBulkText('');
    setParsedData(null);
  }, []);

  const handleFileSelect = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsReadingFile(true);
    try {
      const content = await file.text();
      setBulkText(content);
      setParsedData(parseForPreview(content));
      setImportTab('paste');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo leer el archivo.';
      alert(`No se pudo importar el archivo: ${message}`);
    } finally {
      setIsReadingFile(false);
      if (e.target) {
        e.target.value = '';
      }
    }
  }, []);

  const showPreview = true;
  const hasParsedData = showPreview && parsedData && (parsedData.rows.length > 0 || parsedData.hasHeader);
  const hasText = bulkText.trim().length > 0;

  return (
    <div className="p-4 sm:p-6 bg-indigo-50/50 border-b border-indigo-100">
      <div className="flex gap-2 mb-3 sm:mb-4">
        <button
          onClick={() => setImportTab('paste')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition ${importTab === 'paste' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          Pegar texto
        </button>
        <button
          onClick={() => setImportTab('upload')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition ${importTab === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          Subir archivo
        </button>
      </div>
      {importTab === 'paste' && (
        <>
          <p className="text-[10px] sm:text-xs text-slate-400 mb-2">
            Formato: Value1, Value2, Contexto. Primera columna → término, segunda → definición, tercera → contexto.
            El encabezado se detecta y se ignora automáticamente.
          </p>
          <textarea
            value={bulkText}
            onChange={(e) => handleBulkTextChange(e.target.value)}
            placeholder="Abandon,Abandonar,They had to abandon the project&#10;Absolutely,Absolutamente,This is crucial for scaling"
            className="w-full h-28 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 border border-indigo-100 rounded-xl text-sm mb-3 sm:mb-4 outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-inner resize-y"
          />

          {hasParsedData ? (
            <div
              className="mb-2"
              dangerouslySetInnerHTML={{ __html: renderMappingBadge(parsedData) }}
            />
          ) : (
            <div className="mb-2 text-xs text-slate-400 flex items-center gap-1">
              📋 {hasText ? 'No se detectaron datos válidos' : 'Pega tu texto para ver la vista previa'}
            </div>
          )}

          {hasParsedData && (
            <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 bg-gray-50/50">
              <div
                className="overflow-y-auto max-h-[240px]"
                dangerouslySetInnerHTML={{ __html: renderPreviewTable(parsedData) }}
              />
            </div>
          )}

          <div className="flex items-center justify-between px-3 py-2 bg-gray-50/60 border border-gray-200 rounded-xl text-[10px] sm:text-xs text-slate-500 mb-3">
            <span>
              📊 <span className="font-semibold text-slate-700">{parsedData?.rows.length ?? 0}</span> filas detectadas
              {parsedData && parsedData.rows.length > MAX_PREVIEW_ROWS &&
                ` (mostrando primeras ${MAX_PREVIEW_ROWS})`}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="text-slate-500 hover:text-red-500 underline transition"
            >
              🗑️ Limpiar
            </button>
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => onBulkAdd(bulkText)}
              disabled={!hasParsedData || parsedData?.rows.length === 0}
              className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              Process Import
            </button>
          </div>
        </>
      )}
      {importTab === 'upload' && (
        <div className="flex flex-col items-center gap-3 py-3 sm:py-4">
          <input
            ref={fileInputRef as RefObject<HTMLInputElement>}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingFile}
            className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {isReadingFile ? 'Leyendo archivo...' : 'Elegir archivo CSV'}
          </button>
          <p className="text-[10px] text-slate-500">
            Formato .csv con columnas Value1, Value2, Contexto. El encabezado se detecta y se ignora
            automáticamente.
          </p>
        </div>
      )}
    </div>
  );
};
