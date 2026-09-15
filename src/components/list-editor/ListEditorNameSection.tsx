import React from "react";

interface ListEditorNameSectionProps {
  name: string;
  onRename: (value: string) => void;
  onRenameBlur: () => void;
  nameError: boolean;
  hasName: boolean;
}

export const ListEditorNameSection: React.FC<ListEditorNameSectionProps> = ({
  name,
  onRename,
  onRenameBlur,
  nameError,
  hasName,
}) => {
  return (
    <div className="px-6 py-5 border-b border-slate-100">
      <div className="text-[0.65rem] font-semibold text-[#64748b] uppercase tracking-[0.06em] mb-1.5">
        📚 EDITANDO MAZO
      </div>
      <div
        className={`flex items-center gap-2 rounded-2xl px-4 py-1 transition ${
          hasName
            ? "border border-[#e2e8f0] bg-white"
            : nameError
              ? "border-2 border-rose-400 bg-rose-50/50"
              : "border-2 border-dashed border-[#dce2ea] bg-[#f8faff]"
        } focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10`}
      >
        <input
          id="list-name"
          type="text"
          value={name}
          onChange={(e) => onRename(e.target.value)}
          onBlur={onRenameBlur}
          placeholder="Escribe un nombre para tu mazo..."
          className="flex-1 bg-transparent text-[1.3rem] font-semibold text-[#0b1a26] py-2.5 outline-none placeholder:text-[#94a3b8] placeholder:font-normal"
        />
        <span className="text-base text-[#94a3b8] opacity-0 hover:opacity-100 transition">
          ✏️
        </span>
      </div>
      <div
        className={`text-[0.7rem] mt-1.5 ${
          nameError ? "text-rose-600 font-medium" : "text-[#94a3b8]"
        }`}
      >
        {nameError
          ? "⚠️ Ponle un nombre a tu mazo para poder guardarlo"
          : "💡 Ponle un nombre para identificarlo fácilmente en tu dashboard"}
      </div>
    </div>
  );
};