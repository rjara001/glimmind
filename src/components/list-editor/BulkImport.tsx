import React, { useState, useRef } from 'react';

interface BulkImportProps {
  onBulkAdd: (text: string) => void;
  onFileChange: (file: File) => void;
  isReadingFile: boolean;
}

export const BulkImport: React.FC<BulkImportProps> = ({
  onBulkAdd,
  onFileChange,
  isReadingFile,
}) => {
  const [bulkText, setBulkText] = useState('');
  const [importTab, setImportTab] = useState<'paste' | 'upload'>('paste');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder="Term, Definition (one per line)"
            className="w-full h-28 sm:h-32 px-3 sm:px-4 py-2 sm:py-3 border border-indigo-100 rounded-xl text-sm mb-3 sm:mb-4 outline-none focus:ring-2 focus:ring-indigo-500 font-mono shadow-inner"
          />
          <div className="flex justify-end">
            <button
              onClick={() => onBulkAdd(bulkText)}
              className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition"
            >
              Process Import
            </button>
          </div>
        </>
      )}
      {importTab === 'upload' && (
        <div className="flex flex-col items-center gap-3 py-3 sm:py-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFileChange(file);
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isReadingFile}
            className="bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-bold text-[10px] sm:text-xs uppercase tracking-widest shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-wait"
          >
            {isReadingFile ? 'Leyendo archivo...' : 'Elegir archivo CSV'}
          </button>
          <p className="text-[10px] text-slate-500">
            Formato .csv con &quot;Término, Definición&quot; por línea. El encabezado se detecta y se ignora automáticamente.
          </p>
        </div>
      )}
    </div>
  );
};
