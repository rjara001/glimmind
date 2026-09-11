export interface CsvTriple {
  value1: string;
  value2: string;
  context: string;
}

export interface ColumnMap {
  value1: number;
  value2: number;
  context: number;
}

export interface ImportPreviewData {
  headers: string[];
  rows: CsvTriple[];
  columnMap: ColumnMap;
  hasHeader: boolean;
  error?: string;
  isParsing: boolean;
}
