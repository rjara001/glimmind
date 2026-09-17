import React from "react";
import type { Association } from "../../types";
import type { TableSort } from "../../types/list-editor";

interface ListEditorTableProps {
  associations: Association[];
  sort: TableSort | null;
  onSort: (field: "term" | "definition") => void;
  termHeader: string;
  definitionHeader: string;
  onUpdateField: (id: string, field: keyof Association, value: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
  onBlurRow?: () => void;
  onRemoveRow: (id: string) => void;
  onRestoreRow?: (id: string) => void;
  isArchived?: boolean;
  selectable?: boolean;
  autoOpenId?: string | null;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

export const ListEditorTable: React.FC<ListEditorTableProps> = ({
  associations,
  sort,
  onSort,
  termHeader,
  definitionHeader,
  onUpdateField,
  onUpdateTags,
  onBlurRow,
  onRemoveRow,
  onRestoreRow,
  isArchived = false,
  selectable = false,
  autoOpenId = null,
  selectedIds = new Set(),
  onToggleSelect,
}) => {
  const handleSortClick = (field: "term" | "definition") => {
    onSort(field);
  };

  const getSortIcon = (field: "term" | "definition") => {
    if (!sort || sort.field !== field) return "↕";
    return sort.direction === "asc" ? "↑" : "↓";
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            {selectable && (
              <th className="px-4 py-3 text-left w-10">
                <input
                  type="checkbox"
                  checked={associations.length > 0 && associations.every((a) => selectedIds.has(a.id))}
                  onChange={() => {}}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
              </th>
            )}
            <th
              className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
              onClick={() => handleSortClick("term")}
            >
              <div className="flex items-center gap-1">
                {termHeader}
                <span className="text-xs text-slate-400">{getSortIcon("term")}</span>
              </div>
            </th>
            <th
              className="px-4 py-3 text-left font-semibold text-slate-700 cursor-pointer hover:bg-slate-100"
              onClick={() => handleSortClick("definition")}
            >
              <div className="flex items-center gap-1">
                {definitionHeader}
                <span className="text-xs text-slate-400">{getSortIcon("definition")}</span>
              </div>
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-700">
              Tags
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-700 w-32">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody>
          {associations.map((assoc, index) => (
            <tr
              key={assoc.id}
              className={`border-b border-slate-100 ${isArchived ? "bg-slate-50" : ""} ${
                autoOpenId === assoc.id ? "bg-indigo-50" : ""
              }`}
            >
              {selectable && (
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(assoc.id)}
                    onChange={() => onToggleSelect?.(assoc.id)}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </td>
              )}
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={assoc.term}
                  onChange={(e) => onUpdateField(assoc.id, "term", e.target.value)}
                  onBlur={onBlurRow}
                  autoFocus={autoOpenId === assoc.id && index === 0}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={assoc.definition.join(" | ")}
                  onChange={(e) => onUpdateField(assoc.id, "definition", e.target.value)}
                  onBlur={onBlurRow}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </td>
              <td className="px-4 py-3">
                <input
                  type="text"
                  value={assoc.metadata?.tags?.join(", ") || ""}
                  onChange={(e) => onUpdateTags(assoc.id, e.target.value.split(",").map(t => t.trim()).filter(Boolean))}
                  onBlur={onBlurRow}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="tag1, tag2"
                />
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-1">
                  {isArchived && onRestoreRow && (
                    <button
                      onClick={() => onRestoreRow(assoc.id)}
                      className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                      title="Restaurar"
                    >
                      ↩️
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveRow(assoc.id)}
                    className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title={isArchived ? "Eliminar permanentemente" : "Archivar"}
                  >
                    {isArchived ? "🗑️" : "📦"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};