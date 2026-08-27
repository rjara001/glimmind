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

export type ColumnKey = 'value1' | 'value2' | 'contexto' | 'tags';

interface ColumnConfig {
  key: ColumnKey;
  label: string;
  icon: string;
  field: keyof Association;
}

const COLUMNS: ColumnConfig[] = [
  { key: 'value1', label: 'Value 1', icon: '📝', field: 'term' },
  { key: 'value2', label: 'Value 2', icon: '🌐', field: 'definition' },
  { key: 'contexto', label: 'Contexto', icon: '📖', field: 'context' },
  { key: 'tags', label: 'Tags', icon: '🏷️', field: 'metadata' },
];

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
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  activeColumn?: ColumnKey;
  onColumnChange?: (column: ColumnKey) => void;
}

const CHECKBOX_COL_WIDTH = '80px';
const ACTION_COL_WIDTH = '80px';
const getColumnWidth = (colKey: ColumnKey, activeCol: ColumnKey) => {
  return activeCol === colKey ? '7fr' : '1fr';
};

const getCellValue = (assoc: Association, column: ColumnConfig): string => {
  if (column.key === 'tags') {
    const tags = assoc.metadata?.tags;
    if (!tags || tags.length === 0) return '';
    return tags.join(', ');
  }
  const value = assoc[column.field];
  return typeof value === 'string' ? value : '';
};

const renderTags = (tags: string[]) => {
  if (!tags || tags.length === 0) {
    return <span className="text-slate-300">—</span>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag} className="inline-block px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
          {tag}
        </span>
      ))}
    </div>
  );
};

export const AssociationTable: React.FC<AssociationTableProps> = ({
  associations,
  sort: _sort,
  onSort: _onSort,
  columnPriority: _columnPriority,
  termHeader: _termHeader,
  definitionHeader: _definitionHeader,
  onUpdateField,
  onBlurRow,
  onRemoveRow,
  onRestoreRow,
  isArchived = false,
  selectable = false,
  selectedIds,
  onToggleSelect,
  activeColumn = 'value1',
  onColumnChange,
}) => {
  const handleHeaderClick = (column: ColumnKey) => {
    onColumnChange?.(column);
  };

  const col1 = getColumnWidth('value1', activeColumn);
  const col2 = getColumnWidth('value2', activeColumn);
  const col3 = getColumnWidth('contexto', activeColumn);
  const col4 = getColumnWidth('tags', activeColumn);
  const gridStyle = {
    '--col1': col1,
    '--col2': col2,
    '--col3': col3,
    '--col4': col4,
    gridTemplateColumns: [
      ...(selectable ? [CHECKBOX_COL_WIDTH] : []),
      'var(--col1)',
      'var(--col2)',
      'var(--col3)',
      'var(--col4)',
      ACTION_COL_WIDTH,
    ].join(' '),
  } as React.CSSProperties;

  return (
    <>
      <style>{`
        .grid-expandable {
          display: grid;
          grid-template-columns: var(--col1, 7fr) var(--col2, 1fr) var(--col3, 1fr) var(--col4, 1fr);
          transition: grid-template-columns 0.3s ease;
        }
        .cell-truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .header-btn {
          transition: all 0.3s ease;
          cursor: pointer;
        }
        .header-btn.active {
          background: #eff6ff;
          color: #1d4ed8;
          border-bottom: 2px solid #3b82f6;
        }
        .header-btn.inactive {
          color: #94a3b8;
        }
        .header-btn.inactive:hover {
          color: #475569;
          background: #f8fafc;
        }
      `}</style>
      <div className={`max-h-[55vh] overflow-auto ${isArchived ? 'border-t' : ''}`}>
        <div className="min-w-[640px]">
          {/* Header */}
          <div className="grid-expandable border-b border-slate-200 bg-slate-50/50 sticky top-0 z-10"
            style={gridStyle}
          >
            {selectable && (
              <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center" style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}>
                <input
                  type="checkbox"
                  checked={associations.length > 0 && associations.every(a => selectedIds?.has(a.id))}
                  onChange={(e) => {
                    if (!onToggleSelect) return;
                    const shouldBeSelected = e.target.checked;
                    associations.forEach(a => {
                      const isSelected = selectedIds?.has(a.id) ?? false;
                      if (isSelected !== shouldBeSelected) {
                        onToggleSelect(a.id);
                      }
                    });
                  }}
                  className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                />
              </div>
            )}
            {COLUMNS.map((column) => {
              const isActive = activeColumn === column.key;
              return (
                <button
                  key={column.key}
                  onClick={() => handleHeaderClick(column.key)}
                  className={`px-4 sm:px-8 py-3 sm:py-4 text-left font-semibold text-xs uppercase tracking-wider flex items-center gap-2 header-btn ${isActive ? 'active text-indigo-600 bg-indigo-50/50 border-b-2 border-indigo-500' : 'inactive text-slate-400 hover:text-slate-600'}`}
                  style={{ minWidth: '80px' }}
                >
                  <span>{column.icon}</span>
                  <span>{column.label}</span>
                  {column.key === 'value1' && <SortIndicator sort={_sort} field="term" />}
                  {column.key === 'value2' && <SortIndicator sort={_sort} field="definition" />}
                  {isActive && <span className="ml-auto text-[8px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Activa</span>}
                </button>
              );
            })}
            <div className="px-4 sm:px-8 py-3 sm:py-4 flex items-center" style={{ minWidth: '80px' }}>
              {isArchived ? 'Acción' : ''}
            </div>
          </div>

          {/* Body */}
          {associations.map((assoc) => (
            <div
              key={assoc.id}
              className="grid-expandable border-b border-slate-50 hover:bg-slate-50/80 transition-colors"
              style={gridStyle}
            >
              {selectable && (
                <div className="px-4 sm:px-8 py-2 sm:py-4 flex items-center" style={{ width: CHECKBOX_COL_WIDTH, minWidth: CHECKBOX_COL_WIDTH }}>
                  <input
                    type="checkbox"
                    checked={selectedIds?.has(assoc.id) || false}
                    onChange={() => onToggleSelect?.(assoc.id)}
                    className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                  />
                </div>
              )}
              {COLUMNS.map((column) => {
                const isActive = activeColumn === column.key;
                const value = getCellValue(assoc, column);
                const showTooltip = !isActive && value.length > 0;

                if (isArchived) {
                  return (
                    <div
                      key={column.key}
                      className={`px-4 sm:px-8 py-2 sm:py-4 ${!isActive ? 'cell-truncate' : ''}`}
                      style={{ minWidth: '80px' }}
                      title={showTooltip ? value : undefined}
                    >
                      {column.key === 'tags' ? renderTags(assoc.metadata?.tags || []) : (
                        <span className={!isActive ? 'truncate block' : ''}>{value || <span className="text-slate-200">—</span>}</span>
                      )}
                    </div>
                  );
                }

                return (
                  <div
                    key={column.key}
                    className={`px-4 sm:px-8 py-2 sm:py-4 ${!isActive ? 'cell-truncate' : ''}`}
                    style={{ minWidth: '80px' }}
                    title={showTooltip ? value : undefined}
                  >
                    {column.key === 'value1' && (
                      isActive ? (
                        <input
                          type="text"
                          value={assoc.term}
                          onBlur={onBlurRow}
                          onChange={(e) => onUpdateField(assoc.id, 'term', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 placeholder-slate-300"
                          placeholder="Enter term..."
                        />
                      ) : (
                        <span className="truncate block">{assoc.term || <span className="text-slate-300">—</span>}</span>
                      )
                    )}
                    {column.key === 'value2' && (
                      isActive ? (
                        <input
                          type="text"
                          value={assoc.definition}
                          onBlur={onBlurRow}
                          onChange={(e) => onUpdateField(assoc.id, 'definition', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-indigo-600 placeholder-slate-300"
                          placeholder="Enter definition..."
                        />
                      ) : (
                        <span className="truncate block">{assoc.definition || <span className="text-slate-300">—</span>}</span>
                      )
                    )}
                    {column.key === 'contexto' && (
                      isActive ? (
                        <input
                          type="text"
                          value={assoc.context || ''}
                          onBlur={onBlurRow}
                          onChange={(e) => onUpdateField(assoc.id, 'context', e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-slate-500 placeholder-slate-300"
                          placeholder="Enter context..."
                        />
                      ) : (
                        <span className="truncate block">{assoc.context || <span className="text-slate-300">—</span>}</span>
                      )
                    )}
                    {column.key === 'tags' && (
                      <div className={!isActive ? 'cell-truncate' : ''}>
                        {renderTags(assoc.metadata?.tags || [])}
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="px-4 sm:px-8 py-2 sm:py-4 flex items-center" style={{ minWidth: '80px' }}>
                {isArchived ? (
                  <button onClick={() => onRestoreRow?.(assoc.id)} className="text-indigo-500 hover:text-indigo-700 font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all">
                    Restaurar
                  </button>
                ) : (
                  <button onClick={() => onRemoveRow(assoc.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all p-1" aria-label="Delete row">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
          {associations.length === 0 && (
            <div className="px-4 sm:px-8 py-8 sm:py-12 text-center text-slate-400 text-sm italic">
              {isArchived ? 'No hay resultados en tarjetas archivadas.' : 'Add a card to get started.'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};
