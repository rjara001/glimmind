import React from "react";

interface ListEditorTagFilterProps {
  tags: string[];
  activeFilter: string | null;
  onFilterChange: (filter: string | null) => void;
  activeCount: number;
}

export const ListEditorTagFilter: React.FC<ListEditorTagFilterProps> = ({
  tags,
  activeFilter,
  onFilterChange,
  activeCount,
}) => {
  if (tags.length === 0) return null;

  return (
    <div className="px-6 py-2.5 border-b border-slate-100 bg-slate-50/30 flex flex-wrap gap-1.5">
      <button
        onClick={() => onFilterChange(null)}
        className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full transition ${
          activeFilter === null
            ? "bg-indigo-600 text-white"
            : "bg-slate-100 text-slate-500 hover:bg-slate-200"
        }`}
      >
        Todos ({activeCount})
      </button>
      {tags.map((tag) => {
        return (
          <button
            key={tag}
            onClick={() =>
              onFilterChange(activeFilter === tag ? null : tag)
            }
            className={`inline-block px-2.5 py-1 text-[10px] font-bold rounded-full transition ${
              activeFilter === tag
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
};