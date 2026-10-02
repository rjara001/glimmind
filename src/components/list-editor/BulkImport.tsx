import React, { useState, useRef, useCallback } from 'react';
import type { ChangeEvent, RefObject } from 'react';
import type { ImportPreviewData } from '../../types/import-deck';
import type { ExtractedKeyword, KeywordExtractionOptions } from '../../types/keyword-extraction';
import type { Association } from '../../types';
import { parseForPreview, MAX_PREVIEW_ROWS } from '../../utils/csv';
import { renderMappingBadge, renderPreviewTable } from '../../utils/importPreview';

interface BulkImportProps {
  onBulkAdd: (text: string) => void;
  onFileName?: (name: string) => void;

  // Optional keyword extraction mode (for Dashboard CreateListForm)
  extraction?: {
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
  };
}

export const BulkImport: React.FC<BulkImportProps> = ({
  onBulkAdd,
  onFileName,
  extraction,
}) => {
  const [bulkText, setBulkText] = useState('');
  const [parsedData, setParsedData] = useState<ImportPreviewData | null>(null);
  const [importTab, setImportTab] = useState<'paste' | 'upload' | 'extract'>('paste');
  const [isReadingFile, setIsReadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasExtraction = !!extraction;

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

    onFileName?.(file.name);
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
  }, [onFileName]);

  const showPreview = true;
  const hasParsedData = showPreview && parsedData && (parsedData.rows.length > 0 || parsedData.hasHeader);
  const hasText = bulkText.trim().length > 0;

  // Extraction tab state (derived from extraction prop)
  const extractText = extraction?.extractText ?? '';
  const extractedKeywords = extraction?.extractedKeywords ?? [];
  const selectedKeywords = extraction?.selectedKeywords ?? new Set();
  const isExtracting = extraction?.isExtracting ?? false;
  const hasExtractedKeywords = extractedKeywords.length > 0;
  const selectedCount = selectedKeywords.size;
  const totalExtracted = extractedKeywords.length;
  const charCount = extractText.length;
  const wordCount = extractText.trim() ? extractText.trim().split(/\s+/).length : 0;
  const isOverLimit = charCount > 10000;

  // Count sentences: first try punctuation-based, then fall back to newlines (like Dashboard's splitIntoSentences)
  const punctuationSentences = extractText.match(/[^.!?]+[.!?]+/g)?.length ?? 0;
  const newlineSentences = extractText.trim().split(/\n+/).filter(l => l.trim().length > 0).length;
  const minSentences = Math.max(punctuationSentences, newlineSentences);

  const canExtract = extractText.trim().length >= 50 && minSentences >= 3 && !isExtracting;

  const renderKeywordPreview = () => {
    if (!hasExtractedKeywords || !extraction) return null;

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden mb-3 bg-gray-50/50">
        <div className="overflow-y-auto max-h-[320px] p-3">
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              type="button"
              onClick={extraction.selectAllKeywords}
              disabled={selectedCount === totalExtracted}
              className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 disabled:opacity-50 transition"
            >
              ✅ Seleccionar todo ({totalExtracted})
            </button>
            <button
              type="button"
              onClick={extraction.clearSelection}
              disabled={selectedCount === 0}
              className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50 transition"
            >
              🗑️ Limpiar selección
            </button>
          </div>
          <div className="space-y-1.5">
            {extractedKeywords.map((kw) => {
              const isSelected = selectedKeywords.has(kw.term);
              const typeLabel = kw.type === 'phrase' ? '🔗 Frase' : '🔤 Palabra';
              const scorePct = Math.round(kw.score * 100);
              return (
                <label
                  key={kw.term}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition ${
                    isSelected ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => extraction.toggleKeyword(kw.term)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <span className="font-mono text-sm text-gray-900 flex-1 min-w-0 truncate">{kw.term}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{typeLabel}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded">{scorePct}%</span>
                  <span className="text-[10px] text-gray-400 max-w-[200px] truncate" title={kw.context}>
                    {kw.context}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const renderExtractTab = () => {
    if (!extraction) return null;

    return (
      <>
        <p className="text-xs text-gray-400 mb-2">
          Pegá un artículo, párrafo o notas sueltas. Se extraerán palabras y frases clave automáticamente.
        </p>
        <textarea
          value={extractText}
          onChange={(e) => extraction.setExtractText(e.target.value)}
          placeholder="The quick brown fox jumps over the lazy dog. Machine learning enables computers to learn from data. Neural networks process information through interconnected nodes."
          className="w-full h-32 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm resize-y"
          disabled={isExtracting}
        />
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>
            {charCount.toLocaleString()} caracteres · {wordCount} palabras
            {isOverLimit && <span className="text-red-500 ml-2">⚠️ Límite: 10,000</span>}
          </span>
          <span>{minSentences} oraciones {minSentences < 3 && <span className="text-red-500 ml-1">(mín. 3)</span>}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={() => extraction.runExtraction()}
            disabled={!canExtract || isExtracting}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isExtracting ? '🔍 Analizando...' : '🔍 Analizar y Extraer Vocabulario'}
          </button>
        </div>

        {renderKeywordPreview()}

        {hasExtractedKeywords && selectedCount > 0 && (
          <div className="flex justify-end mt-4">
            <button
              type="button"
              onClick={() => {
                const associations = extraction.getSelectedAssociations();
                const text = associations.map(a => `${a.term},${a.definition[0] || ''},${a.context || ''}`).join('\n');
                onBulkAdd(text);
              }}
              className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition"
            >
              Process Extract ({selectedCount})
            </button>
          </div>
        )}
      </>
    );
  };

  const tabButtons = [
    { id: 'paste' as const, label: 'Pegar texto' },
    { id: 'upload' as const, label: 'Subir archivo' },
    ...(hasExtraction ? [{ id: 'extract' as const, label: '🔍 Extraer Keywords' }] : []),
  ];

  return (
    <div className="p-4 sm:p-6 bg-indigo-50/50 border-b border-indigo-100">
      <div className="flex gap-2 mb-3 sm:mb-4">
        {tabButtons.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setImportTab(tab.id)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition ${
              importTab === tab.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-indigo-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
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
      {importTab === 'extract' && renderExtractTab()}
    </div>
  );
};
