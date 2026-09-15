import React from "react";

interface ListEditorTranslationBarProps {
  selectedCount: number;
  translationUsed: number;
  translationLimit: number;
  translationPercentage: number;
  translationState: "ok" | "warning" | "blocked";
}

export const ListEditorTranslationBar: React.FC<ListEditorTranslationBarProps> = ({
  selectedCount,
  translationUsed,
  translationLimit,
  translationPercentage,
  translationState,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/30">
      <div className="flex items-center gap-3 text-[10px]">
        <span
          className={`font-bold uppercase tracking-wider ${
            translationState === "blocked"
              ? "text-rose-600"
              : translationState === "warning"
                ? "text-amber-600"
                : "text-slate-500"
          }`}
        >
          Traducción: {translationUsed.toLocaleString()} /{" "}
          {translationLimit.toLocaleString()} chars
        </span>
        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-[200px]">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              translationState === "blocked"
                ? "bg-rose-500"
                : translationState === "warning"
                  ? "bg-amber-500"
                  : "bg-indigo-400"
            }`}
            style={{ width: `${translationPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};