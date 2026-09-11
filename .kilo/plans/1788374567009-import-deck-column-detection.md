# Plan: Auto-Detect Columns on Deck Import with Live Preview

## Goal
When a user pastes text into the "Create new list" bulk import area, the system automatically detects column headers and identifies which columns map to **Value1** (term), **Value2** (definition), and **Contexto** (context). A live mapping badge and preview table update in real-time, showing the parsed 3-column data. The context column is then persisted on imported associations.

## Scope
- **Target flow**: Dashboard → `CreateListForm` → `BulkImportPanel` (new deck creation)
- **Out of scope (follow-up)**: `ListEditor → BulkImport` (add cards to existing deck) — same enhancement can be applied later if desired
- **Strict column ordering**: Column 1 → Value1, Column 2 → Value2, Column 3 → Contexto (never reordered)

## Current State
- `src/utils/csv.ts` — `parseCsvPairs(content)` returns `CsvPair[]` = `{term, definition}[]` — only 2 columns; context is lost
- `src/hooks/dashboard/useDeckImporter.ts` — uses `parseCsvPairs`; returns `Association[]` without context; no preview state
- `src/components/views/dashboard/BulkImportPanel.tsx` — textarea + file upload; no live preview, no column mapping UI
- `src/types.ts` — `Association` already has `context?: string`
- `src/utils/text.ts` — `normalizeText` helper (lowercase, trim, strip accents)

## Design Decisions

### 1. New parser: `parseCsvTriples`
- Extends the existing `parseCsvLine` and header-detection logic to parse **up to 3 columns** per row
- Returns `CsvTriple[]` = `{ value1: string, value2: string, context: string }[]`
- If a row has fewer than 3 cells, missing columns normalize to `''`:
  ```ts
  const cells = parseCsvLine(line);
  return {
    value1: (cells[0] ?? '').trim(),
    value2: (cells[1] ?? '').trim(),
    context: (cells[2] ?? '').trim(),
  };
  ```
- If a row has 4+ columns, takes first 3, ignores extras
- Strips BOM, normalizes CRLF → LF, filters empty lines (reuses existing patterns from `parseCsvPairs`)

### 2. Text normalization for header detection
- Reuse the existing `normalizeText` from `src/utils/text.ts` (lowercase, trim, strip accents/diacritics, normalize whitespace/dashes)
- Apply `normalizeText` to every header cell before keyword matching:
  ```ts
  const normalized = headers.map(h => normalizeText(h));
  ```
- This ensures "Término" matches "termino", "Definición" matches "definicion", etc.

### 3. Header detection: `detectColumnHeaders`
- Keyword lists (English + Spanish + anverso/reverso/back/front), matched via `normalizeText` + `includes`:
  - **VALUE1_KEYWORDS** (term): `term`, `word`, `concept`, `english`, `ingles`, `valor1`, `value1`, `palabra`, `termino`, `front`, `anverso`, `lado a`, `cara a`, `vocab`
  - **VALUE2_KEYWORDS** (definition): `definition`, `meaning`, `definicion`, `significado`, `spanish`, `espanol`, `valor2`, `value2`, `back`, `reverso`, `lado b`, `cara b`, `translation`, `traductor`
  - **CONTEXT_KEYWORDS** (context): `context`, `contexto`, `example`, `ejemplo`, `sentence`, `frase`, `valor3`, `value3`, `scenario`, `escenario`, `sample`, `muestra`, `usage`, `uso`, `note`, `nota`
- **Matching strategy**: For each header cell, check if ANY keyword is found as a substring (`header.includes(kw) || kw.includes(header)`)
- **Threshold**: Use 60% match threshold instead of requiring ALL cells:
  ```ts
  function isHeaderRow(headers: string[]): boolean {
    const normalized = headers.map(h => normalizeText(h));
    let matchCount = 0;
    const allKeywords = [...VALUE1_KEYWORDS, ...VALUE2_KEYWORDS, ...CONTEXT_KEYWORDS];
    for (const header of normalized) {
      if (allKeywords.some(kw => header.includes(kw) || kw.includes(header))) matchCount++;
    }
    return matchCount >= Math.ceil(headers.length * 0.6);
  }
  ```
- Returns `ImportPreviewData` with:
  - `headers`: detected header names (or generic `['Columna 1', 'Columna 2', 'Columna 3']` if no header)
  - `rows`: parsed `CsvTriple[]` (excludes header row if detected)
  - `columnMap`: `{ value1: 0, value2: 1, context: 2 }` (strict order)
  - `hasHeader`: boolean
  - `error?`: string (parse/syntax error message, if any)
  - `isParsing?`: boolean (set during async-safe parsing — though parser is synchronous, reserved for future use)

### 4. Preview data model
New type `ImportPreviewData` (in `src/types/import-deck.ts`):
```
{
  headers: string[];       // detected or generic header names
  rows: CsvTriple[];       // parsed data rows (3 columns each)
  columnMap: ColumnMap;    // { value1: 0, value2: 1, context: 2 }
  hasHeader: boolean;      // whether a header row was detected
  error?: string;          // parse error message, if any
  isParsing: boolean;      // true during parsing (always false for sync parser)
}
```

### 5. Hook enhancement: `useDeckImporter`
- Add `parsedData` state (`ImportPreviewData | null`) + `setParsedData`
- `parseBulkData(text)` now calls `parseCsvTriples` + `detectColumnHeaders` internally, then maps column 0→term, column 1→definition, column 2→context on each `AssociationLike`
- Add `parseForPreview(text)` callback: runs `parseCsvTriples` + `detectColumnHeaders`, sets `parsedData` state
- Wire `parseForPreview` to textarea `onChange` + `onPaste` events (debounced via `setTimeout` like the HTML mock's 100ms)
- `handleFileChange` also uses `parseCsvTriples` + `detectColumnHeaders` for consistency
- `resetBulkInputs()` clears `parsedData` too

### 6. UI enhancement: `BulkImportPanel`
Following the HTML mock design — add these elements (styled with Tailwind CSS to match existing codebase):
- **Mapping badge** (below toolbar, above textarea): shows `1 → Value1: [header]`, `2 → Value2: [header]`, `3 → Contexto: [header]`
- **Live preview table** (below textarea): 3-column table (Value1, Value2, Contexto), first 50 rows only, with `+X rows more` indicator if over 50
- **Status bar** (below preview): `📊 N filas detectadas (mostrando primeras 50)` + Clear button + Process Import button
- All update automatically as the user types/pastes
- When no text: show placeholder "📋 Pega tu texto para ver la vista previa"

## Files to Create/Modify

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `src/types/import-deck.ts` | Create | `CsvTriple`, `ColumnMap`, `ImportPreviewData` type definitions |
| 2 | `src/utils/csv.ts` | Modify | Add keyword constants, `parseCsvTriples()`, `detectColumnHeaders()` / `isHeaderRow()` |
| 3 | `src/hooks/dashboard/useDeckImporter.ts` | Modify | Add `parsedData` state + `parseForPreview`; update `parseBulkData` and `handleFileChange` to use 3-column parser and populate `context` |
| 4 | `src/components/views/dashboard/BulkImportPanel.tsx` | Modify | Add mapping badge, live preview table, status bar, clear button — match HTML mock design |
| 5 | `src/types/import-deck.ts` | Already created (item 1) | `CsvTriple`/related types already defined here; no separate barrel needed |
| 6 | `tests/utils/csv.test.ts` | Modify | Add tests for `parseCsvTriples` and `detectColumnHeaders`/`isHeaderRow` |
| 7 | `src/constants/version.ts` | Modify | Bump `APP_VERSION` 1.20.0 → 1.21.0 |
| 8 | `package.json` | Modify | Bump `version` 1.20.0 → 1.21.0 |

## Implementation Order

1. **Types** (`src/types/import-deck.ts`): Define `CsvTriple`, `ColumnMap`, `ImportPreviewData`
2. **Parser** (`src/utils/csv.ts`): Add keyword constants, `parseCsvTriples`, `detectColumnHeaders`/`isHeaderRow`
3. **Hook** (`useDeckImporter.ts`): Add preview state + parsing callback; wire context into `parseBulkData` and `handleFileChange`
4. **Component** (`BulkImportPanel.tsx`): Add mapping badge + preview table + status bar
5. **Tests** (`csv.test.ts`): Unit tests for new parser and header detection
6. **Version bump**: `version.ts` + `package.json`
7. **Verify**: `npx tsc --noEmit`, `npx vitest run tests/utils/csv.test.ts`

## Risks & Mitigations

- **Backward compat**: Existing 2-column paste still works — `parseCsvTriples` returns empty context; existing `parseCsvPairs` callers (ListEditor) are untouched; `parseCsvPairs` is kept as-is
- **Header false positives**: 60% threshold reduces false negatives while catching partial keywords (e.g., "Term,Definition" without a context header still detected as header row)
- **Data row mistaken as header**: Only the first row is tested for headers; a data row like "term,definition" as the first line is unlikely to also have 3 columns with matching keywords
- **Performance**: Parsing is synchronous and in-memory; preview updates on every keystroke are negligible for typical paste sizes (<500 rows)
- **Quoted cells with commas**: Reuses existing `parseCsvLine` which already handles quoted cells correctly
- **Missing 3rd column**: Rows with only 2 columns get `context: ''` — no error, just empty context

## Validation
- Unit tests: `parseCsvTriples` handles comma/tab/semicolon delimiters, quoted cells, 3-column + 2-column + 1-column rows, BOM, CRLF line endings
- Unit tests: `detectColumnHeaders`/`isHeaderRow` detects English & Spanish headers, 60% threshold catches partial matches, doesn't false-positive on data rows, generates generic headers when no match
- Integration: typing/pasting in `BulkImportPanel` textarea updates mapping badge + preview table live; "N rows detectadas (mostrando primeras 50)" updates in real-time
- `tsc --noEmit` passes with no type errors
- Existing CSV tests still pass (14/14)
- `npx vitest run tests/utils/csv.test.ts` — all green

## Open Questions
1. **ListEditor scope**: Apply the same 3-column + context enhancement to `ListEditor → BulkImport`? (recommended: defer to follow-up for v1.21.0)
2. **Preview row limit**: HTML mock shows "mostrando primeras 50" — keep 50 as the max displayed rows, with `+X rows more` indicator
3. **Column drag-reorder**: HTML mock uses strict order (no reordering) — confirmed no drag-reorder needed in v1.21.0
4. **Error handling surface**: When `error` is set on `ImportPreviewData`, how should the UI surface it? Recommended: show inline error text in the status bar area below the preview table
