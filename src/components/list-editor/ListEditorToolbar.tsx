import React from "react";

interface ListEditorToolbarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedCount: number;
  translateLang: string;
  onTranslateLangChange: (lang: string) => void;
  isTranslating: boolean;
  onTranslate: () => void;
  onDelete: () => void;
  onExport: () => void;
  onAddRow: () => void;
  isAddRowDisabled: boolean;
  onToggleBulk: () => void;
}

export const ListEditorToolbar: React.FC<ListEditorToolbarProps> = ({
  searchTerm,
  onSearchChange,
  selectedCount,
  translateLang,
  onTranslateLangChange,
  isTranslating,
  onTranslate,
  onDelete,
  onExport,
  onAddRow,
  isAddRowDisabled,
  onToggleBulk,
}) => {
  return (
    <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 flex-wrap">
      <div className="relative flex-1 min-w-[200px]">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <svg
            className="h-4 w-4 text-[#94a3b8]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Buscar tarjeta..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-3.5 py-2.5 border border-[#dce2ea] rounded-full text-[0.85rem] bg-[#fafcff] text-[#0b1a26] outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition"
        />
      </div>

      {selectedCount > 0 && (
        <>
          <select
            value={translateLang}
            onChange={(e) => onTranslateLangChange(e.target.value)}
            className="bg-white border border-indigo-200 text-indigo-700 px-3 py-2.5 rounded-full text-[0.7rem] font-bold outline-none"
          >
            <option value="es">🇪🇸 ES</option>
            <option value="fr">🇫🇷 FR</option>
            <option value="de">🇩🇪 DE</option>
            <option value="pt">🇧🇷 PT</option>
          </select>
          <button
            onClick={onTranslate}
            disabled={isTranslating}
            className="bg-white border border-indigo-200 text-indigo-700 px-4 py-2.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider hover:border-indigo-600 transition disabled:opacity-50"
          >
            {isTranslating ? "Traduciendo..." : "Traducir"}
          </button>
          <button
            onClick={onDelete}
            className="bg-white border border-rose-200 text-rose-700 px-4 py-2.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider hover:border-rose-600 transition"
          >
            Eliminar
          </button>
          <button
            onClick={onExport}
            className="bg-white border border-emerald-200 text-emerald-700 px-4 py-2.5 rounded-full text-[0.7rem] font-bold uppercase tracking-wider hover:border-emerald-600 transition"
          >
            Exportar
          </button>
        </>
      )}

      <button
        onClick={onAddRow}
        disabled={isAddRowDisabled}
        className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-[0.8rem] font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        + Añadir tarjeta
      </button>
      <button
        onClick={onToggleBulk}
        className="px-5 py-2.5 rounded-full border border-[#dce2ea] bg-white text-[#1f3347] text-[0.8rem] font-medium hover:bg-[#f1f5f9] transition whitespace-nowrap"
      >
        📥 Importar
      </button>
    </div>
  );
};