import React from "react";

interface ListEditorFooterProps {
  totalCards: number;
  isSaving: boolean;
  onSave: () => void;
  hasName: boolean;
  onNameFocus: () => void;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

export const ListEditorFooter: React.FC<ListEditorFooterProps> = ({
  totalCards,
  isSaving,
  onSave,
  hasName,
  onNameFocus,
  showToast,
}) => {
  const handleSaveClick = () => {
    if (!hasName) {
      onNameFocus();
      showToast("⚠️ Ponle un nombre a tu mazo antes de guardar.", "error");
      return;
    }
    onSave();
  };

  return (
    <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3.5 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] flex justify-between items-center gap-3">
      <div className="text-[0.8rem] text-[#64748b]">
        📊{" "}
        <span className="font-bold text-[#0b1a26] text-base">
          {totalCards}
        </span>{" "}
        tarjetas
      </div>
      <button
        type="button"
        onClick={handleSaveClick}
        disabled={isSaving}
        className={`flex items-center gap-1.5 px-6 py-2.5 rounded-full font-semibold text-[0.8rem] transition shadow-md ${
          isSaving
            ? "bg-emerald-600 text-white cursor-wait"
            : "bg-indigo-600 text-white hover:bg-indigo-700"
        }`}
      >
        {isSaving ? "✅ Guardando..." : "💾 Guardar mazo"}
      </button>
    </div>
  );
};