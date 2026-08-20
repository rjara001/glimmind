import React from 'react';
import type { Association } from '../../types';

interface SortIndicatorProps {
  sort: { field: string; direction: 'asc' | 'desc' } | null;
  field: string;
}

export const SortIndicator: React.FC<SortIndicatorProps> = ({
  sort,
  field,
}) => {
  const isActive = sort?.field === field;
  const isDescending = sort?.direction === 'desc';
  return (
    <svg
      className={`w-3 h-3 transition ${isActive ? 'text-indigo-600' : 'text-slate-200 group-hover:text-slate-400'} ${isActive && isDescending ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={3}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
};

interface AssociationTableProps {
  associations: Association[];
  sort: { field: string; direction: 'asc' | 'desc' } | null;
  onSort: (sort: { field: string; direction: 'asc' | 'desc' }) => void;
  columnPriority: 'term' | 'definition';
  termHeader: string;
  definitionHeader: string;
  onUpdateField: (id: string, field: keyof Association, value: string) => void;
  onBlurRow: () => void;
  onRemoveRow: (id: string) => void;
  onRestoreRow?: (id: string) => void;
  isArchived?: boolean;
}

export const AssociationTable: React.FC<AssociationTableProps> = ({
  associations,
  sort,
  onSort,
  columnPriority,
  termHeader,
  definitionHeader,
  onUpdateField,
  onBlurRow,
  onRemoveRow,
  onRestoreRow,
  isArchived = false,
}) => {
  return (
    <div className={`max-h-[55vh] overflow-x-auto ${isArchived ? 'border-t' : ''}`}>
      <table className="w-full text-left min-w-[640px]">
        <thead>
          <tr className="text-[10px] uppercase text-slate-400 font-black border-b bg-white sticky top-0 z-10">
            <th className="px-4 sm:px-8 py-3 sm:py-4">
              <button
                onClick={() => onSort({ field: 'term', direction: sort?.field === 'term' && sort.direction === 'asc' ? 'desc' : 'asc' })}
                className="flex items-center gap-1.5 uppercase group hover:text-slate-600 transition"
                aria-label={`Prioridad: ${termHeader}`}
              >
                {termHeader}
                <span className="text-[8px] normal-case tracking-normal opacity-60 group-hover:opacity-100 transition-opacity">
                  {columnPriority === 'term' ? '●' : '○'}
                </span>
                <SortIndicator sort={sort} field="term" />
              </button>
            </th>
            <th className="px-4 sm:px-8 py-3 sm:py-4 hidden sm:table-cell">
              <button
                onClick={() => onSort({ field: 'definition', direction: sort?.field === 'definition' && sort.direction === 'asc' ? 'desc' : 'asc' })}
                className="flex items-center gap-1.5 uppercase group hover:text-slate-600 transition"
                aria-label={`Prioridad: ${definitionHeader}`}
              >
                {definitionHeader}
                <span className="text-[8px] normal-case tracking-normal opacity-60 group-hover:opacity-100 transition-opacity">
                  {columnPriority === 'definition' ? '●' : '○'}
                </span>
                <SortIndicator sort={sort} field="definition" />
              </button>
            </th>
            <th className={`px-4 sm:px-8 py-3 sm:py-4 ${isArchived ? 'w-24 text-right' : 'w-16 sm:w-24'}`}>
              {isArchived ? 'Acción' : ''}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {associations.map((assoc) => (
            <tr key={assoc.id} className={`group hover:bg-slate-50/80 transition-colors ${isArchived ? 'bg-slate-50/50' : ''}`}>
              <td className={`px-4 sm:px-8 py-2 sm:py-4 ${isArchived ? 'font-semibold text-slate-500 italic' : ''}`}>
                {isArchived ? (
                  assoc.term
                ) : (
                  <input
                    type="text"
                    value={assoc.term}
                    onBlur={onBlurRow}
                    onChange={(e) => onUpdateField(assoc.id, 'term', e.target.value)}
                    className={`w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 placeholder-slate-300 ${columnPriority === 'definition' ? 'sm:truncate' : ''}`}
                    placeholder="Enter term..."
                  />
                )}
              </td>
              <td className={`px-4 sm:px-8 py-2 sm:py-4 hidden sm:table-cell ${isArchived ? 'text-slate-500 italic' : ''}`}>
                {isArchived ? (
                  assoc.definition
                ) : (
                  <input
                    type="text"
                    value={assoc.definition}
                    onBlur={onBlurRow}
                    onChange={(e) => onUpdateField(assoc.id, 'definition', e.target.value)}
                    className={`w-full bg-transparent border-none focus:ring-0 text-slate-500 placeholder-slate-300 ${columnPriority === 'term' ? 'sm:truncate' : ''}`}
                    placeholder="Enter definition..."
                  />
                )}
              </td>
              <td className="px-4 sm:px-8 py-2 sm:py-4">
                {isArchived ? (
                  <div className="text-right">
                    <button onClick={() => onRestoreRow?.(assoc.id)} className="text-indigo-500 hover:text-indigo-700 font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all">
                      Restaurar
                    </button>
                  </div>
                ) : (
                  <button onClick={() => onRemoveRow(assoc.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1" aria-label="Delete row">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </td>
            </tr>
          ))}
          {associations.length === 0 && (
            <tr>
              <td colSpan={3} className="px-4 sm:px-8 py-8 sm:py-12 text-center text-slate-400 text-sm italic">
                {isArchived ? 'No hay resultados en tarjetas archivadas.' : 'Add a card to get started.'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
