import { describe, it, expect } from 'vitest';
import { buildAssociationsCsv, parseCsvPairs, isHeaderPair, parseCsvTriples, isHeaderRow, parseForPreview, MAX_PREVIEW_ROWS } from '@/utils/csv';
import { Association } from '@/types';

const createAssociation = (term: string, definition: string, context = ''): Association => ({
  id: crypto.randomUUID(),
  term,
  definition,
  context,
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
});

describe('buildAssociationsCsv', () => {
  it('writes a header and one row per association', () => {
    const associations = [
      createAssociation('hola', 'hello', 'in a house'),
      createAssociation('mundo', 'world', ''),
    ];

    const result = buildAssociationsCsv(associations);

    expect(result).toBe('Term,Definition,Context\nhola,hello,in a house\nmundo,world,');
  });

  it('quotes cells that contain commas', () => {
    const associations = [createAssociation('uno, dos', 'one, two', 'en la, casa')];

    const result = buildAssociationsCsv(associations);

    expect(result).toBe('Term,Definition,Context\n"uno, dos","one, two","en la, casa"');
  });

  it('escapes embedded quotes', () => {
    const associations = [createAssociation('el "gato"', 'the "cat"', 'en la "casa"')];

    const result = buildAssociationsCsv(associations);

    expect(result).toBe('Term,Definition,Context\n"el ""gato""","the ""cat""","en la ""casa"""');
  });

  it('uses a custom header', () => {
    const associations = [createAssociation('hola', 'hello', 'context text')];

    const result = buildAssociationsCsv(associations, ['Español', 'English', 'Contexto']);

    expect(result).toBe('Español,English,Contexto\nhola,hello,context text');
  });
});

describe('parseCsvPairs', () => {
  it('parses comma-separated pairs', () => {
    const result = parseCsvPairs('hola,hello\nmundo,world');

    expect(result).toEqual([
      { term: 'hola', definition: 'hello' },
      { term: 'mundo', definition: 'world' },
    ]);
  });

  it('strips a UTF-8 BOM from the first line', () => {
    const result = parseCsvPairs('\uFEFFhola,hello');

    expect(result).toEqual([{ term: 'hola', definition: 'hello' }]);
  });

  it('handles CRLF line endings', () => {
    const result = parseCsvPairs('hola,hello\r\nmundo,world\r\n');

    expect(result).toEqual([
      { term: 'hola', definition: 'hello' },
      { term: 'mundo', definition: 'world' },
    ]);
  });

  it('keeps commas inside quoted cells', () => {
    const result = parseCsvPairs('"uno, dos","one, two"');

    expect(result).toEqual([{ term: 'uno, dos', definition: 'one, two' }]);
  });

  it('unescapes embedded quotes', () => {
    const result = parseCsvPairs('"el ""gato""","the ""cat"""');

    expect(result).toEqual([{ term: 'el "gato"', definition: 'the "cat"' }]);
  });

  it('supports tab and semicolon separators', () => {
    const result = parseCsvPairs('hola\thello\nmundo;world');

    expect(result).toEqual([
      { term: 'hola', definition: 'hello' },
      { term: 'mundo', definition: 'world' },
    ]);
  });

  it('ignores empty lines and rows without content', () => {
    const result = parseCsvPairs('hola,hello\n\n  \nmundo,world\n, ');

    expect(result).toEqual([
      { term: 'hola', definition: 'hello' },
      { term: 'mundo', definition: 'world' },
    ]);
  });
});

describe('isHeaderPair', () => {
  it('detects known header labels ignoring case and accents', () => {
    expect(isHeaderPair({ term: 'Term', definition: 'Definition' }, 'Español', 'English')).toBe(true);
    expect(isHeaderPair({ term: 'Término', definition: 'Definición' }, 'Español', 'English')).toBe(true);
    expect(isHeaderPair({ term: 'Palabra', definition: 'Significado' }, 'Español', 'English')).toBe(true);
  });

  it('detects headers that match the list concept headers', () => {
    expect(isHeaderPair({ term: 'Español', definition: 'English' }, 'Español', 'English')).toBe(true);
  });

  it('does not flag regular data rows', () => {
    expect(isHeaderPair({ term: 'hola', definition: 'hello' }, 'Español', 'English')).toBe(false);
    expect(isHeaderPair({ term: 'Term', definition: 'hello' }, 'Español', 'English')).toBe(false);
    expect(isHeaderPair({ term: 'hola', definition: 'Definición' }, 'Español', 'English')).toBe(false);
  });
});

describe('parseCsvTriples', () => {
  it('parses 3-column comma-separated data', () => {
    const result = parseCsvTriples('Abandon,Abandonar,They had to abandon the project');

    expect(result).toEqual([
      { value1: 'Abandon', value2: 'Abandonar', context: 'They had to abandon the project' },
    ]);
  });

  it('parses tab and semicolon delimiters', () => {
    const result = parseCsvTriples('hola\thola\tun gato\nsalto; salto; el niño salta');

    expect(result).toEqual([
      { value1: 'hola', value2: 'hola', context: 'un gato' },
      { value1: 'salto', value2: 'salto', context: 'el niño salta' },
    ]);
  });

  it('strips a UTF-8 BOM from the first line', () => {
    const result = parseCsvTriples('\uFEFFAbandon,Abandonar,context here');

    expect(result).toEqual([
      { value1: 'Abandon', value2: 'Abandonar', context: 'context here' },
    ]);
  });

  it('handles CRLF line endings', () => {
    const result = parseCsvTriples('a,b,c\r\nd,e,f\r\n');

    expect(result).toEqual([
      { value1: 'a', value2: 'b', context: 'c' },
      { value1: 'd', value2: 'e', context: 'f' },
    ]);
  });

  it('keeps commas inside quoted cells', () => {
    const result = parseCsvTriples('"uno, dos","one, two","a, b, c"');

    expect(result).toEqual([
      { value1: 'uno, dos', value2: 'one, two', context: 'a, b, c' },
    ]);
  });

  it('unescapes embedded quotes', () => {
    const result = parseCsvTriples('"el ""gato""","the ""cat""","in the ""house"""');

    expect(result).toEqual([
      { value1: 'el "gato"', value2: 'the "cat"', context: 'in the "house"' },
    ]);
  });

  it('handles rows with fewer than 3 columns', () => {
    const result = parseCsvTriples('hola,hello');

    expect(result).toEqual([
      { value1: 'hola', value2: 'hello', context: '' },
    ]);
  });

  it('ignores empty lines and rows without content', () => {
    const result = parseCsvTriples('a,b,c\n\n  \nd,e,f\n, ,');

    expect(result).toEqual([
      { value1: 'a', value2: 'b', context: 'c' },
      { value1: 'd', value2: 'e', context: 'f' },
    ]);
  });

  it('pairs lines without delimiters as consecutive rows', () => {
    const result = parseCsvTriples('term1\nterm2 definition2');

    expect(result).toEqual([
      { value1: 'term1', value2: 'term2 definition2', context: '' },
    ]);
  });
});

describe('isHeaderRow', () => {
  it('detects English headers meeting 60% threshold (2 of 3)', () => {
    expect(isHeaderRow(['term', 'definition', ''] as string[])).toBe(true);
    expect(isHeaderRow(['Term', 'Definition', ''])).toBe(true);
  });

  it('detects Spanish headers', () => {
    expect(isHeaderRow(['Término', 'Definición', 'Contexto'])).toBe(true);
    expect(isHeaderRow(['palabra', 'significado', ''])).toBe(true);
  });

  it('detects headers with extra keywords', () => {
    expect(isHeaderRow(['word', 'meaning', 'example'])).toBe(true);
    expect(isHeaderRow(['English', 'Spanish', 'sentence'])).toBe(true);
  });

  it('does not flag regular data rows as headers', () => {
    expect(isHeaderRow(['Abandon', 'Abandonar', 'They had to abandon'])).toBe(false);
    expect(isHeaderRow(['hola', 'hello', 'a,b,c'])).toBe(false);
  });

  it('returns false for empty cells', () => {
    expect(isHeaderRow([])).toBe(false);
    expect(isHeaderRow([''])).toBe(false);
    expect(isHeaderRow(['', '', ''])).toBe(false);
  });

  it('detects single-column headers', () => {
    expect(isHeaderRow(['term'])).toBe(true);
    expect(isHeaderRow(['concept'])).toBe(true);
  });

  it('detects partial keyword matches (substring matching)', () => {
    expect(isHeaderRow(['term1', 'defini', 'conte'])).toBe(true);
    expect(isHeaderRow(['Word Count', 'Definition List', 'Context Example'])).toBe(true);
  });
});

describe('parseForPreview', () => {
  it('detects header row and skips it from data rows', () => {
    const result = parseForPreview('Term,Definition,Context\nhola,hello,context here');

    expect(result.hasHeader).toBe(true);
    expect(result.headers).toEqual(['Term', 'Definition', 'Context']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ value1: 'hola', value2: 'hello', context: 'context here' });
    expect(result.columnMap).toEqual({ value1: 0, value2: 1, context: 2 });
    expect(result.isParsing).toBe(false);
  });

  it('detects Spanish headers', () => {
    const result = parseForPreview('Término,Definición,Contexto\nAbandon,Abandonar,They had to abandon');

    expect(result.hasHeader).toBe(true);
    expect(result.rows[0]).toEqual({ value1: 'Abandon', value2: 'Abandonar', context: 'They had to abandon' });
  });

  it('uses generic headers when no header row detected', () => {
    const result = parseForPreview('hola,hello,context');

    expect(result.hasHeader).toBe(false);
    expect(result.headers).toEqual(['Columna 1', 'Columna 2', 'Columna 3']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ value1: 'hola', value2: 'hello', context: 'context' });
  });

  it('returns empty result for empty input', () => {
    const result = parseForPreview('');

    expect(result.hasHeader).toBe(false);
    expect(result.rows).toHaveLength(0);
    expect(result.headers).toEqual(['Columna 1', 'Columna 2', 'Columna 3']);
  });

  it('handles 2-column data without context', () => {
    const result = parseForPreview('hola,hello\nmundo,world');

    expect(result.rows).toEqual([
      { value1: 'hola', value2: 'hello', context: '' },
      { value1: 'mundo', value2: 'world', context: '' },
    ]);
  });

  it('handles 2-column data with header', () => {
    const result = parseForPreview('Term,Definition\nhola,hello');

    expect(result.hasHeader).toBe(true);
    expect(result.headers).toEqual(['Term', 'Definition', 'Columna 3']);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual({ value1: 'hola', value2: 'hello', context: '' });
  });

  it('ignores extra columns beyond the first 3', () => {
    const result = parseForPreview('term,def,context,extra1,extra2\nval1,val2,val3,val4,val5');

    expect(result.rows[0]).toEqual({ value1: 'val1', value2: 'val2', context: 'val3' });
  });
});
