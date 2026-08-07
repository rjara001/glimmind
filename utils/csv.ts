import { Association } from '../types';
import { normalizeText } from './text';

const COMMA = ',';
const NEWLINE = '\n';
const QUOTE = '"';
const DOUBLE_QUOTE = '""';
const BOM = '\uFEFF';
const CSV_MIME_TYPE = 'text/csv;charset=utf-8;';
const DEFAULT_HEADER: [string, string] = ['Term', 'Definition'];
const TAB = '\t';
const SEMICOLON = ';';
const HEADER_TERMS = ['term', 'termino', 'palabra', 'word', 'name', 'nombre'];
const HEADER_DEFINITIONS = ['definition', 'definicion', 'meaning', 'significado', 'description', 'descripcion'];

export interface CsvPair {
  term: string;
  definition: string;
}

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
  const lines = withoutBom
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return lines
    .map(line => {
      const cells = parseCsvLine(line);
      return {
        term: (cells[0] ?? '').trim(),
        definition: (cells[1] ?? '').trim(),
      };
    })
    .filter(pair => pair.term || pair.definition);
}

export function isHeaderPair(pair: CsvPair, termHeader: string, definitionHeader: string): boolean {
  const term = normalizeText(pair.term);
  const definition = normalizeText(pair.definition);
  if (term === normalizeText(termHeader) && definition === normalizeText(definitionHeader)) {
    return true;
  }
  return HEADER_TERMS.includes(term) && HEADER_DEFINITIONS.includes(definition);
}

export function buildAssociationsCsv(
  associations: Association[],
  header: [string, string] = DEFAULT_HEADER
): string {
  const rows = associations.map((association) => [
    escapeCell(association.term),
    escapeCell(association.definition),
  ]);
  const lines = [
    `${escapeCell(header[0])}${COMMA}${escapeCell(header[1])}`,
    ...rows.map((row) => row.join(COMMA)),
  ];
  return lines.join(NEWLINE);
}

export function downloadAssociationsCsv(
  associations: Association[],
  fileName: string,
  header: [string, string] = DEFAULT_HEADER
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
