# Plan: Text Importer View — Free Text Deck Creation

## Goal
Replace the out-of-context `VocabularyPreview` modal for free-text flows with a dedicated inline `TextImporter` view that supports auto-highlighting of AI-extracted vocabulary, interactive term tooltips, manual text selection, and in-place deck saving.

## Scope
- New view: `text-importer` (standalone, navigated from Dashboard)
- New component: `src/components/views/TextImporter.tsx`
- Minimal wiring in `App.tsx` and `Dashboard.tsx` / `CustomCreationSection.tsx`
- **Out of scope:** Changes to `CreateYouTubeDeckModal`, backend endpoints, or external tooltip libraries.

## Decision Log

### 1. Navigation & Routing
- Add `'text-importer'` to `AppView` in `src/types/app.ts`.
- `App.tsx` renders `<TextImporter />` when `view === 'text-importer'`.
- `CustomCreationSection` gets a new CTA card: **"📝 Texto Libre"** with description *"Pegá un artículo, transcripción o texto y generamos vocabulario automáticamente"*.
- `Dashboard` passes `onTextImport: () => navigate('text-importer')` into `CustomCreationSection`.

### 2. TextImporter State Machine
Two modes only:
- `EDIT_MODE`: plain `<textarea>` + submit button.
- `READ_MODE`: rich HTML container with highlights + action bar.

State shape:
```ts
type ImporterMode = 'EDIT_MODE' | 'READ_MODE';

interface TextImporterState {
  mode: ImporterMode;
  rawText: string;
  isLoading: boolean;
  error: string | null;
  vocabularyItems: VocabularyItem[];   // from API + manual additions
  selectionMenu: SelectionMenu | null; // floating menu state
  manualInput: { text: string; translation: string } | null; // fallback translation UI
  isTranslating: boolean;
}
```

### 3. Auto-Highlight Flow (EDIT_MODE → READ_MODE)
1. User pastes text and submits.
2. Call `youtubeDeckService.createDeckFromText(rawText, config)`.
3. On success:
   - Set `rawText` from `result.rawSourceText ?? rawText`.
   - Set `vocabularyItems = result.items`.
   - Switch to `READ_MODE`.
4. Render `rawText` as React nodes, splitting on vocabulary `term` values (case-insensitive match, longest-first).
5. Each match is wrapped in a `<mark>` with Tailwind styles (`bg-amber-100 text-amber-900 rounded px-1 cursor-pointer`).

### 4. Term Tooltips (pure React + Tailwind)
- Each `<mark>` is wrapped in a `<span>` with relative positioning.
- On hover/click, render an absolutely-positioned popover inside the relative span:
  - Translation (`item.translation ?? item.example ?? ''`)
  - Tags from `item.metadata?.tags`
  - **🗑️ Descartar** button → removes item from `vocabularyItems`, triggers re-render (mark disappears).
- Popover z-index managed via Tailwind (`z-20`), dark background for contrast.

### 5. Manual Selection (Selection API)
- Container listens to `onMouseUp`.
- On mouseup:
  - `const selection = window.getSelection()`
  - If selection is non-empty and inside the container, read `selection.toString().trim()`.
  - Compute bounding rect via `selection.getRangeAt(0).getBoundingClientRect()`.
  - Set `selectionMenu = { text, x, y }`.
- Render floating button **"➕ Agregar al mazo"** at `(x, y)` using `position: fixed`.
- Hide menu on:
  - `mousedown` outside the menu
  - `Escape` key
  - Successful add or cancel.

### 6. Add Selected Text (Auto-translate → Manual Fallback)
When user clicks **"Agregar al mazo"**:
1. Clear selection (`window.getSelection().removeAllRanges()`).
2. Call `translationService.translateVocabulary(userId, [{ text: selectedText }], targetLang, 'en')`.
3. If success:
   - Add `VocabularyItem` to `vocabularyItems`.
   - Re-render (new text gets highlighted).
4. If error:
   - Show inline manual input inside the floating menu:
     - Editable translation field
     - **Guardar** button → adds item with manual translation
     - **Cancelar** button → hides menu

### 7. Action Bar (READ_MODE bottom)
- Left: **"✏️ Editar texto fuente"** → switches back to `EDIT_MODE`, preserves `rawText`.
- Center/Right: **"X expresiones seleccionadas"** counter.
- Primary button: **"💾 Guardar Mazo en Firestore"** → invokes save flow (see §8).

### 8. Save / Persistence Flow
`TextImporter` exposes `onSave(associations, sourceMeta)` callback.

In `App.tsx`:
- Add state: `pendingTextImport: { associations: Association[]; sourceMeta: VocabularySourceMeta } | null`.
- Add effect (similar to existing `pendingYouTube` effect):
  ```ts
  useEffect(() => {
    if (view === 'editor' && pendingTextImport) {
      const tempList: AssociationList = {
        id: `temp_${Date.now()}`,
        userId: user?.uid || GUEST_UID,
        name: `Texto Libre - ${pendingTextImport.sourceMeta.rawSourceText?.slice(0, 40) ?? 'Deck'}`,
        concept: 'value1 / value2',
        associations: pendingTextImport.associations,
        isArchived: false,
        sourceType: 'raw_text',
        sourceUrl: undefined,
        rawSourceText: pendingTextImport.sourceMeta.rawSourceText,
        sourceRow: undefined,
        settings: { ...DEFAULT_LIST_SETTINGS },
      };
      // ... same temp-list injection as pendingYouTube flow
      setPendingTextImport(null);
    }
  }, [view, pendingTextImport, user, lists]);
  ```
- `onSave` in `App.tsx`:
  ```ts
  const handleTextImportSave = (associations: Association[], sourceMeta: VocabularySourceMeta) => {
    setPendingTextImport({ associations, sourceMeta });
    navigate('editor');
  };
  ```

### 9. Type Additions
- `VocabularySourceMeta` already exists in `VocabularyPreview.tsx` and is exported — reuse it.
- `VocabularyItem` already exists in `src/types/youtube-deck.ts` — reuse it.
- `SelectionMenu` interface (local to `TextImporter.tsx`):
  ```ts
  interface SelectionMenu {
    text: string;
    x: number;
    y: number;
  }
  ```

### 10. Component Structure (TextImporter.tsx)
```
Imports
Types (SelectionMenu, TextImporterProps)
Component function
  - State declarations
  - Handlers (submit, delete term, add selection, save, back to edit)
  - Effects (selection menu keyboard/click-outside cleanup)
  - Render:
    if EDIT_MODE: textarea + submit
    if READ_MODE:
      - Rich text container (onMouseUp → selection logic)
      - Selection floating menu
      - Action bar (edit, counter, save)
```

## Implementation Tasks (ordered)

1. **`src/types/app.ts`**: Add `'text-importer'` to `AppView`.
2. **`src/components/onboarding/CustomCreationSection.tsx`**: Add "📝 Texto Libre" CTA card wired to new `onTextImport` prop.
3. **`src/components/views/Dashboard.tsx`**: Pass `onTextImport` to `CustomCreationSection`.
4. **`src/components/views/TextImporter.tsx`**: Build the full component (EDIT_MODE / READ_MODE, highlighting, tooltips, selection menu, auto-translate fallback, action bar).
5. **`src/App.tsx`**: 
   - Add `showTextImporter` / `pendingTextImport` state (or reuse view state).
   - Render `<TextImporter />` when `view === 'text-importer'`.
   - Add `handleTextImportSave` callback.
   - Add effect to inject temp list on `pendingTextImport`.
6. **Validation**: Run `npm run typecheck` and `npm run lint` (or `tsc` / `eslint`) to verify strict typing and no regressions.

## Risks & Mitigations
- **Long-term matching performance**: If `vocabularyItems` grows large (150+), regex split on every render could lag. Mitigation: memoize highlighted nodes with `useMemo` keyed on `[rawText, vocabularyItems]`.
- **Overlapping highlights**: Longest-first regex + `split` avoids partial overlaps. Adjacent terms render as separate `<mark>` elements — acceptable.
- **Selection menu positioning**: Use `position: fixed` with `getBoundingClientRect` to avoid clipping inside scrollable containers. Clamp to viewport bounds.
- **Translation quota/errors**: Fallback to manual input is mandatory; never block the user from adding a card.

## Validation Plan
- Manual: Open Dashboard → "Texto Libre" → paste text → submit → verify READ_MODE with highlights.
- Manual: Hover/click a `<mark>` → verify tooltip shows translation + discard works.
- Manual: Select arbitrary text → verify floating menu appears → click add → verify auto-translate OR manual fallback.
- Manual: Click "Guardar Mazo" → verify temp list appears in editor with `rawSourceText` preserved.
- Typecheck/lint: Must pass with zero new errors.
