import React from "react";

interface ListEditorHeaderProps {
  onBack: () => void;
  onBackLabel?: string;
}

export const ListEditorHeader: React.FC<ListEditorHeaderProps> = ({
  onBack,
  onBackLabel = "Volver al dashboard",
}) => {
  return (
    <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100 bg-[#fafcff]">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#dce2ea] bg-white text-[0.8rem] font-medium text-[#1f3347] hover:bg-[#f1f5f9] transition"
      >
        ← {onBackLabel}
      </button>
    </div>
  );
};