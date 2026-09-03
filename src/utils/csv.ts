import { Association } from '../types';
import type { CsvTriple, ColumnMap, ImportPreviewData } from '../types/import-deck';
import { normalizeText } from './text';
import { joinDefinitions } from './normalizeAssociation';

const COMMA = ',';
const NEWLINE = '\n';
const QUOTE = '"';
const DOUBLE_QUOTE = '""';
const BOM = '\uFEFF';
const CSV_MIME_TYPE = 'text/csv;charset=utf-8;';
const DEFAULT_HEADER: [string, string, string] = ['Term', 'Definition', 'Context'];
const TAB = '\t';
const SEMICOLON = ';';
const HEADER_TERMS = ['term', 'termino', 'palabra', 'word', 'name', 'nombre'];
const HEADER_DEFINITIONS = ['definition', 'definicion', 'meaning', 'significado', 'description', 'descripcion'];

const VALUE1_KEYWORDS = [
  'term', 'word', 'concept', 'english', 'ingles', 'valor1', 'value1',
  'palabra', 'termino', 'front', 'anverso', 'lado a', 'cara a', 'vocab',
];
const VALUE2_KEYWORDS = [
  'definition', 'meaning', 'definicion', 'significado', 'spanish', 'espanol',
  'valor2', 'value2', 'back', 'reverso', 'lado b', 'cara b', 'translation', 'traductor',
];
const CONTEXT_KEYWORDS = [
  'context', 'contexto', 'example', 'ejemplo', 'sentence', 'frase',
  'valor3', 'value3', 'scenario', 'escenario', 'sample', 'muestra', 'usage', 'uso', 'note', 'nota',
];
const ALL_HEADER_KEYWORDS = [...VALUE1_KEYWORDS, ...VALUE2_KEYWORDS, ...CONTEXT_KEYWORDS];
const HEADER_MATCH_THRESHOLD = 0.6;
export const MAX_PREVIEW_ROWS = 50;
const GENERIC_HEADERS: [string, string, string] = ['Columna 1', 'Columna 2', 'Columna 3'];
const FIXED_COLUMN_MAP: ColumnMap = { value1: 0, value2: 1, context: 2 };

export interface CsvPair {
  term: string;
  definition: string;
}

export type { CsvTriple } from '../types/import-deck';

function escapeCell(value: string): string {
  if (!/[",\n\r]/.test(value)) {
    return value;
  }
  return `${QUOTE}${value.split(QUOTE).join(DOUBLE_QUOTE)}${QUOTE}`;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === QUOTE) {
        if (line[i + 1] === QUOTE) {
          cell += QUOTE;
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === QUOTE) {
      inQuotes = true;
    } else if (char === COMMA || char === TAB || char === SEMICOLON) {
      cells.push(cell);
      cell = '';
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  return cells;
}

export function parseCsvPairs(content: string): CsvPair[] {
  const withoutBom = content.startsWith(BOM) ? content.slice(BOM.length) : content;
  const normalized = withoutBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const hasDelimiter = (line: string) => line.includes(',') || line.includes(';') || line.includes('\t');

  const result: CsvPair[] = [];
  let pendingTerm: string | null = null;

  for (const line of lines) {
    if (hasDelimiter(line)) {
      const cells = parseCsvLine(line);
      result.push({
        term: (cells[0] ?? '').trim(),
        definition: (cells[1] ?? '').trim(),
      });
      pendingTerm = null;
    } else if (pendingTerm === null) {
      pendingTerm = line;
    } else if (pendingTerm !== null) {
      result.push({ term: pendingTerm, definition: line });
      pendingTerm = null;
    }
  }

  if (pendingTerm !== null) {
    result.push({ term: pendingTerm, definition: '' });
  }

  return result.filter(pair => pair.term || pair.definition);
}

export function isHeaderPair(pair: CsvPair, termHeader: string, definitionHeader: string): boolean {
  const term = normalizeText(pair.term);
  const definition = normalizeText(pair.definition);
  if (term === normalizeText(termHeader) && definition === normalizeText(definitionHeader)) {
    return true;
  }
  return HEADER_TERMS.includes(term) && HEADER_DEFINITIONS.includes(definition);
}

export function parseCsvTriples(content: string): CsvTriple[] {
  const withoutBom = content.startsWith(BOM) ? content.slice(BOM.length) : content;
  const normalized = withoutBom.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  const hasDelimiter = (line: string) => line.includes(',') || line.includes(';') || line.includes('\t');

  const result: CsvTriple[] = [];
  let pendingValue1: string | null = null;

  for (const line of lines) {
    if (hasDelimiter(line)) {
      const cells = parseCsvLine(line);
      result.push({
        value1: (cells[0] ?? '').trim(),
        value2: (cells[1] ?? '').trim(),
        context: (cells[2] ?? '').trim(),
      });
      pendingValue1 = null;
    } else if (pendingValue1 === null) {
      pendingValue1 = line;
    } else {
      result.push({ value1: pendingValue1, value2: line, context: '' });
      pendingValue1 = null;
    }
  }

  if (pendingValue1 !== null) {
    result.push({ value1: pendingValue1, value2: '', context: '' });
  }

  return result.filter(triple => triple.value1 || triple.value2 || triple.context);
}

export function isHeaderRow(cells: string[]): boolean {
  const nonEmpty = cells.filter(c => c.trim().length > 0);
  if (nonEmpty.length === 0) return false;
  const normalized = nonEmpty.map(h => normalizeText(h));
  let matchCount = 0;
  for (const header of normalized) {
    if (ALL_HEADER_KEYWORDS.some(kw => header.includes(kw) || kw.includes(header))) {
      matchCount++;
    }
  }
  const threshold = Math.ceil(nonEmpty.length * HEADER_MATCH_THRESHOLD);
  return matchCount >= threshold;
}

export function parseForPreview(content: string): ImportPreviewData {
  const triples = parseCsvTriples(content);

  if (triples.length === 0) {
    return {
      headers: [...GENERIC_HEADERS],
      rows: [],
      columnMap: { ...FIXED_COLUMN_MAP },
      hasHeader: false,
      isParsing: false,
    };
  }

  const firstRow: CsvTriple = triples[0];
  const firstRowCells = [firstRow.value1, firstRow.value2, firstRow.context].filter(h => h.length > 0);
  const hasHeader = firstRowCells.length > 0 && isHeaderRow(firstRowCells);

  let headers: [string, string, string];
  let rows: CsvTriple[];

  if (hasHeader) {
    headers = [
      firstRow.value1 || GENERIC_HEADERS[0],
      firstRow.value2 || GENERIC_HEADERS[1],
      firstRow.context || GENERIC_HEADERS[2],
    ];
    rows = triples.slice(1);
  } else {
    headers = [...GENERIC_HEADERS];
    rows = triples;
  }

  return {
    headers,
    rows,
    columnMap: { ...FIXED_COLUMN_MAP },
    hasHeader,
    isParsing: false,
  };
}

export function buildAssociationsCsv(
  associations: Association[],
  header: [string, string, string] = DEFAULT_HEADER
): string {
  const rows = associations.map((association) => [
    escapeCell(association.term),
    escapeCell(joinDefinitions(association.definition)),
    escapeCell(association.context ?? ''),
  ]);
  const lines = [
    `${escapeCell(header[0])}${COMMA}${escapeCell(header[1])}${COMMA}${escapeCell(header[2])}`,
    ...rows.map((row) => row.join(COMMA)),
  ];
  return lines.join(NEWLINE);
}

export function downloadAssociationsCsv(
  associations: Association[],
  fileName: string,
  header: [string, string, string] = DEFAULT_HEADER
): void {
  const csv = `${BOM}${buildAssociationsCsv(associations, header)}`;
  const blob = new Blob([csv], { type: CSV_MIME_TYPE });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
