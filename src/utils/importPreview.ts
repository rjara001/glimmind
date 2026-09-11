import type { ImportPreviewData } from "../types/import-deck";
import { MAX_PREVIEW_ROWS } from "./csv";

export { MAX_PREVIEW_ROWS };

export interface ColumnLabel {
  key: "value1" | "value2" | "context";
  label: string;
}

export const COLUMN_LABELS: ColumnLabel[] = [
  { key: "value1", label: "Value1" },
  { key: "value2", label: "Value2" },
  { key: "context", label: "Contexto" },
];

export function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen)}…`;
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderMappingBadge(parsedData: ImportPreviewData): string {
  const mappings = [
    { label: "1 → Value1:", value: parsedData.headers[0] || 'Columna 1' },
    { label: "2 → Value2:", value: parsedData.headers[1] || 'Columna 2' },
    { label: "3 → Contexto:", value: parsedData.headers[2] || 'Columna 3' },
  ];

  let html = '<div class="flex flex-wrap gap-3 px-3 py-2 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs">';
  html += '<span class="flex items-center gap-1 text-slate-500 font-medium"><span>📌</span> Orden de columnas:</span>';
  for (const m of mappings) {
    const escapedValue = escapeHtml(m.value);
    html += `<span class="flex items-center gap-1"><span class="text-slate-500">${escapeHtml(m.label)}</span><span class="font-semibold text-indigo-600">${escapedValue}</span></span>`;
  }
  html += '</div>';
  return html;
}

export function renderPreviewTable(parsedData: ImportPreviewData): string {
  const displayRows = parsedData.rows.slice(0, MAX_PREVIEW_ROWS);
  const hasMore = parsedData.rows.length > MAX_PREVIEW_ROWS;

  let html = '<table class="w-full border-collapse"><thead><tr>';
  for (const col of COLUMN_LABELS) {
    html += `<th class="px-3 py-2 text-left text-xs font-semibold text-slate-700 bg-slate-50 border-b-2 border-slate-200">${col.label}</th>`;
  }
  html += '</tr></thead><tbody>';

  if (displayRows.length === 0) {
    html += '<tr><td colspan="3" class="py-4 text-center text-slate-400 text-sm">📋 No se encontraron filas de datos</td></tr>';
  } else {
    for (const row of displayRows) {
      const cells = [row.value1, row.value2, row.context];
      html += '<tr>';
      for (const cell of cells) {
        const escaped = escapeHtml(cell);
        const display = cell ? truncate(escaped, 40) : '—';
        html += `<td class="px-3 py-2 text-sm text-slate-700 border-b border-slate-100 max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap" title="${escaped}">${display}</td>`;
      }
      html += '</tr>';
    }
  }

  if (hasMore) {
    const moreCount = parsedData.rows.length - MAX_PREVIEW_ROWS;
    html += `<tr><td colspan="3" class="px-3 py-2 text-center text-xs text-slate-400 italic">+ ${moreCount} filas más</td></tr>`;
  }

  html += '</tbody></table>';
  return html;
}
