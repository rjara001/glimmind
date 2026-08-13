import { describe, it, expect } from 'vitest';
import { buildAssociationsCsv, parseCsvPairs, isHeaderPair } from './csv';
import { Association } from '../types';

const createAssociation = (term: string, definition: string): Association => ({
  id: crypto.randomUUID(),
  term,
  definition,
  currentCycle: 1,
  status: 'pending',
  isLearned: false,
  isArchived: false,
});

describe('buildAssociationsCsv', () => {
  it('writes a header and one row per association', () => {
    const associations = [
      createAssociation('hola', 'hello'),
      createAssociation('mundo', 'world'),
    ];

    const result = buildAssociationsCsv(associations);

    expect(result).toBe('Term,Definition\nhola,hello\nmundo,world');
  });

  it('quotes cells that contain commas', () => {
    const associations = [createAssociation('uno, dos', 'one, two')];

    const result = buildAssociationsCsv(associations);

    expect(result).toBe('Term,Definition\n"uno, dos","one, two"');
  });

  it('escapes embedded quotes', () => {
    const associations = [createAssociation('el "gato"', 'the "cat"')];

    const result = buildAssociationsCsv(associations);

    expect(result).toBe('Term,Definition\n"el ""gato""","the ""cat"""');
  });

  it('uses a custom header', () => {
    const associations = [createAssociation('hola', 'hello')];

    const result = buildAssociationsCsv(associations, ['Español', 'English']);

    expect(result).toBe('Español,English\nhola,hello');
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
