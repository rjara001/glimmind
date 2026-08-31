import React, { useState, useEffect } from 'react';
import type { Association } from '../../types';
import { joinDefinitions } from '../../utils/normalizeAssociation';
import { DictionaryShortcuts } from './DictionaryShortcuts';

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
  termHeader: string;
  definitionHeader: string;
  onUpdateField: (id: string, field: keyof Association, value: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onBlurRow: () => void;
  onRemoveRow: (id: string) => void;
  onRestoreRow?: (id: string) => void;
  isArchived?: boolean;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  autoOpenId?: string | null;
}

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
}

const TagEditor: React.FC<TagEditorProps> = ({ tags, onChange }) => {
  const [draft, setDraft] = useState('');

  const addTag = () => {
    const value = draft.trim().replace(/,+$/, '');
    if (!value) return;
    if (!tags.includes(value)) {
      onChange([...tags, value]);
    }
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && draft === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-indigo-50 text-indigo-700 rounded-full"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-indigo-400 hover:text-rose-500 font-bold"
            aria-label={`Remove tag ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      <input
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder="Add tag + Enter..."
        className="flex-1 min-w-[120px] bg-transparent border-b border-slate-200 focus:border-indigo-400 text-xs text-slate-700 placeholder-slate-300 focus:outline-none py-0.5"
      />
    </div>
  );
};

interface DetailDrawerProps {
  assoc: Association;
  termHeader: string;
  definitionHeader: string;
  isArchived: boolean;
  onUpdateField: (id: string, field: keyof Association, value: string) => void;
  onUpdateTags?: (id: string, tags: string[]) => void;
  onBlurRow: () => void;
  onClose: () => void;
}

const DetailDrawer: React.FC<DetailDrawerProps> = ({
  assoc,
  termHeader,
  definitionHeader,
  isArchived,
  onUpdateField,
  onUpdateTags,
  onBlurRow,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-md h-full bg-white shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Card detail"
      >
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-base font-bold text-slate-800">Detalle de tarjeta</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 transition p-1"
            aria-label="Close detail"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {termHeader || 'Value 1'}
            </label>
            <input
              type="text"
              value={assoc.term}
              disabled={isArchived}
              onChange={(e) => onUpdateField(assoc.id, 'term', e.target.value)}
              onBlur={onBlurRow}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
              />
            </div>

          <DictionaryShortcuts term={assoc.term} />

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              {definitionHeader || 'Value 2'}
            </label>
            <input
              type="text"
              value={joinDefinitions(assoc.definition)}
              disabled={isArchived}
              onChange={(e) => onUpdateField(assoc.id, 'definition', e.target.value)}
              onBlur={onBlurRow}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Contexto
            </label>
            <textarea
              value={assoc.context || ''}
              disabled={isArchived}
              onChange={(e) => onUpdateField(assoc.id, 'context', e.target.value)}
              onBlur={onBlurRow}
              rows={3}
              placeholder="Add context..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 placeholder-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Tags
            </label>
            {isArchived ? (
              <div className="flex flex-wrap gap-1.5">
                {(assoc.metadata?.tags || []).length === 0 ? (
                  <span className="text-slate-300 text-xs">—</span>
                ) : (
                  (assoc.metadata?.tags || []).map((tag) => (
                    <span key={tag} className="inline-block px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-full">
                      {tag}
                    </span>
                  ))
                )}
              </div>
            ) : (
              <TagEditor
                tags={assoc.metadata?.tags || []}
                onChange={(tags) => {
                  onUpdateTags?.(assoc.id, tags);
                  onBlurRow();
                }}
              />
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                onBlurRow();
                onClose();
              }}
              className="w-full bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl px-4 py-2.5 hover:bg-indigo-700 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ACTIVE_COL_WIDTH = '40px';
const ACTION_COL_WIDTH = '60px';

export const AssociationTable: React.FC<AssociationTableProps> = ({
  associations,
  sort: _sort,
  onSort,
  termHeader: _termHeader,
  definitionHeader: _definitionHeader,
  onUpdateField,
  onUpdateTags,
  onBlurRow,
  onRemoveRow,
  onRestoreRow,
  isArchived = false,
  selectable = false,
  selectedIds,
  onToggleSelect,
  autoOpenId,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (autoOpenId) {
      setExpandedId(autoOpenId);
    }
  }, [autoOpenId]);

  const expandedAssoc = expandedId
    ? associations.find((a) => a.id === expandedId)
    : undefined;

  const handleBlurRow = () => {
    onBlurRow();
  };

  const headerColumns = [
    ...(selectable ? [ACTIVE_COL_WIDTH] : []),
    ACTIVE_COL_WIDTH,
    '1fr',
    '1fr',
    ACTION_COL_WIDTH,
  ].join(' ');

  const rowColumns = [
    ...(selectable ? [ACTIVE_COL_WIDTH] : []),
    ACTIVE_COL_WIDTH,
    '1fr',
    '1fr',
    ACTION_COL_WIDTH,
  ].join(' ');

  const headerStyle = { gridTemplateColumns: headerColumns } as React.CSSProperties;
  const rowStyle = { gridTemplateColumns: rowColumns } as React.CSSProperties;

  return (
    <>
      <style>{`
        .grid-two {
          display: grid;
        }
        .cell-truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s ease-out;
        }
        @keyframes slide-in-right {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
      <div className={`max-h-[55vh] overflow-auto ${isArchived ? 'border-t' : ''}`}>
        <div className="min-w-[560px]">
          {/* Header */}
          <div
            className="grid-two border-b border-slate-200 bg-slate-50 sticky top-0 z-20"
            style={headerStyle}
          >
            {selectable && (
              <div className="px-2 sm:px-3 py-3 sm:py-4 flex items-center" style={{ width: ACTIVE_COL_WIDTH, minWidth: ACTIVE_COL_WIDTH }}>
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
            <div className="px-2 sm:px-3 py-3 sm:py-4 flex items-center" style={{ width: ACTIVE_COL_WIDTH, minWidth: ACTIVE_COL_WIDTH }} aria-hidden="true">
              <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <button
              type="button"
              onClick={() => onSort({ field: 'term', direction: _sort?.field === 'term' && _sort.direction === 'asc' ? 'desc' : 'asc' })}
              className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition"
            >
              <span>📝</span>
              <span>{_termHeader || 'Value 1'}</span>
              <SortIndicator sort={_sort} field="term" />
            </button>
            <button
              type="button"
              onClick={() => onSort({ field: 'definition', direction: _sort?.field === 'definition' && _sort.direction === 'asc' ? 'desc' : 'asc' })}
              className="px-4 sm:px-6 py-3 sm:py-4 text-left font-semibold text-xs uppercase tracking-wider flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition"
            >
              <span>🌐</span>
              <span>{_definitionHeader || 'Value 2'}</span>
              <SortIndicator sort={_sort} field="definition" />
            </button>
            <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center" style={{ minWidth: '60px' }}>
              {isArchived ? 'Acción' : ''}
            </div>
          </div>

          {/* Body */}
          {associations.map((assoc) => {
            const isExpanded = expandedId === assoc.id;
            return (
              <div
                key={assoc.id}
                className={`group grid-two border-b border-slate-50 hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/40' : ''}`}
                style={rowStyle}
              >
                {selectable && (
                  <div className="px-2 sm:px-3 py-2 sm:py-4 flex items-center" style={{ width: ACTIVE_COL_WIDTH, minWidth: ACTIVE_COL_WIDTH }}>
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(assoc.id) || false}
                      onChange={() => onToggleSelect?.(assoc.id)}
                      className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                    />
                  </div>
                )}
                <div className="px-2 sm:px-3 py-2 sm:py-4 flex items-center" style={{ width: ACTIVE_COL_WIDTH, minWidth: ACTIVE_COL_WIDTH }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : assoc.id)}
                    className={`text-slate-400 hover:text-indigo-600 transition p-0.5 ${isExpanded ? 'text-indigo-600' : ''}`}
                    aria-label={isExpanded ? 'Collapse detail' : 'Expand detail'}
                    aria-expanded={isExpanded}
                  >
                    <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
                <div className="px-4 sm:px-6 py-2 sm:py-4 flex items-center">
                  <input
                    type="text"
                    value={assoc.term}
                    onBlur={handleBlurRow}
                    onChange={(e) => onUpdateField(assoc.id, 'term', e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 font-bold text-slate-900 placeholder-slate-300 disabled:opacity-60"
                    placeholder="Enter term..."
                    disabled={isArchived}
                  />
                </div>
                <div className="px-4 sm:px-6 py-2 sm:py-4 flex items-center cell-truncate">
                  <input
                    type="text"
                    value={joinDefinitions(assoc.definition)}
                    onBlur={handleBlurRow}
                    onChange={(e) => onUpdateField(assoc.id, 'definition', e.target.value)}
                    className="w-full bg-transparent border-none focus:ring-0 text-indigo-600 placeholder-slate-300 disabled:opacity-60"
                    placeholder="Enter definition..."
                    disabled={isArchived}
                  />
                </div>
                <div className="px-2 sm:px-3 py-2 sm:py-4 flex items-center justify-center" style={{ minWidth: '60px' }}>
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
            );
          })}
          {associations.length === 0 && (
            <div className="px-4 sm:px-8 py-8 sm:py-12 text-center text-slate-400 text-sm italic">
              {isArchived ? 'No hay resultados en tarjetas archivadas.' : 'Add a card to get started.'}
            </div>
          )}
        </div>
      </div>

      {expandedAssoc && (
        <DetailDrawer
          assoc={expandedAssoc}
          termHeader={_termHeader}
          definitionHeader={_definitionHeader}
          isArchived={isArchived}
          onUpdateField={onUpdateField}
          onUpdateTags={onUpdateTags}
          onBlurRow={onBlurRow}
          onClose={() => setExpandedId(null)}
        />
      )}
    </>
  );
};
