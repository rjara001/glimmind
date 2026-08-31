# Definite Sidebar Integration (Card Detail)

**Date:** 2026-08-31
**Status:** Proposed

## Context

The List Editor already exposes an inline right-side `DetailDrawer` (defined inside
`src/components/list-editor/AssociationTable.tsx`) that opens when a row's chevron is
clicked. Today it renders:

- `VALUE1` (term), `VALUE2` (definition), `Contexto`, and `Tags` (via the inline
  `TagEditor`), plus a `Cerrar` button.

The game spec expects this sidebar to be the **definitive card detail surface**. The
current drawer is functionally correct but is missing the dictionary **revalidation**
section that lets a learner verify or adjust the meaning of `VALUE1` from authoritative
external sources before committing `VALUE2`.

This plan turns the existing `DetailDrawer` into the definitive sidebar by adding a
**REVALIDAR SIGNIFICADO (CONFIANZA)** block with four direct-access dictionary buttons
whose URLs are built on the fly from the current `VALUE1` (term) value.

## Goals

- Keep the sidebar as the single place to inspect and edit a card's detail.
- Add four dictionary quick links (Cambridge, WordReference, Urban Dictionary, YouGlish)
  that build their URL from the live `VALUE1` content.
- Open each link in a **new tab** (`target="_blank"`) so the user can consult the source
  and return to the sidebar to adjust `VALUE2` if needed.
- Preserve existing behavior (field updates, tag editing, blur/persist flow).

## Design Decisions

### 1. New revalidation section placement

Insert a new block in the `DetailDrawer` body between the `VALUE1` input and the
`VALUE2` input, matching the order in the mockup:

```text
VALUE1        (editable)
[ REVALIDAR SIGNIFICADO (CONFIANZA) ]
[ Cambridge ] [ WordReference ]
[ Urban Dictionary ] [ YouGlish ]
VALUE2        (editable)
Contexto
Tags
```

The section is always rendered regardless of `isArchived`; links are informational and
need no write access. To keep the file focused, the shortcut UI is extracted into a
small presentational component `DictionaryShortcuts` in the same
`src/components/list-editor/` folder (components → PascalCase, AGENTS.md rule 12).

### 2. URL construction from VALUE1

URLs are derived from `assoc.term` at render time. Because a term may contain spaces and
non-ASCII characters, each source gets its own URL-encoding helper. Base URLs (constants,
no magic strings — AGENTS.md rule 23):

| Source | Base URL template |
|--------|-------------------|
| Cambridge | `https://dictionary.cambridge.org/dictionary/english-spanish/{term}` |
| WordReference | `https://www.wordreference.com/es/translation.asp?tranword={term}` |
| Urban Dictionary | `https://www.urbandictionary.com/define.php?term={term}` |
| YouGlish | `https://youglish.com/pronounce/{term}/english` |

Where `{term}` is the URL-encoded form of the trimmed `VALUE1` (e.g. `then again` →
`then%20again`). `encodeURIComponent` is reused rather than a new utility; a small
`buildDictionaryUrls(term): DictionaryLink[]` helper centralizes the four templates.

A `DictionaryLink` type records `{ key, label, icon, href }` so the section is data-driven
and easy to extend.

```typescript
// src/types/dictionary-link.ts
export interface DictionaryLink {
  key: 'cambridge' | 'wordreference' | 'urbandictionary' | 'youglish';
  label: string;
  icon: string;      // emoji glyph (📖 📚 🗣️ 🎬)
  href: string;
}
```

### 3. Clean opening

Each anchor renders with `target="_blank"` and `rel="noopener noreferrer"` for safety
(AGENTS.md rule 21). Using a real `<a>` (semantic HTML) satisfies the a11y requirement in
AGENTS.md rule 20 instead of a `div onClick`.

Clicking a link never closes the sidebar nor triggers a blur-save, so the in-progress
`VALUE2` editing state is preserved while consulting the dictionary.

### 4. Buttons are presentational

`DictionaryShortcuts` only renders links and calls its own `buildDictionaryUrls`. It does
not mutate `Association`, does not advance game state, and performs no side effects. All
persist/update logic continues to live in the parent `ListEditor` via the existing
`onUpdateField` / `onUpdateTags` / `onBlurRow` props (AGENTS.md rule 28).

## Files Changed

### New files

- `src/types/dictionary-link.ts` — `DictionaryLink` interface (types live in `src/types/`,
  AGENTS.md rule 7 — never inside a component).
- `src/components/list-editor/DictionaryShortcuts.tsx` — presentational section that
  renders the four `<a target="_blank">` buttons from `buildDictionaryUrls(term)`.

### Modified files

- `src/components/list-editor/AssociationTable.tsx`
  - Import and render `DictionaryShortcuts` inside `DetailDrawer` between `VALUE1` and
    `VALUE2`.
  - Keep the existing `TagEditor`, `Contexto`, and persist flow untouched.

## Out of Scope

- Changing the `Association`, `metadata`, `tags`, or `context` schema.
- Writing the dictionary base templates into the game/in-game drawer (`GameView`).
- Server-side search or embedding dictionary content; links only open external tabs.
- Voice/STT integration in this drawer.

## Conventions

- All code, comments, docs, and commits in English (AGENTS.md rule 1).
- Types in `src/types/` — never inside components (AGENTS.md rule 7).
- No `any`; use explicit types (AGENTS.md rule 7).
- Semantic `<a>` for external links, `target="_blank" rel="noopener noreferrer"`
  (AGENTS.md rule 20/21).
- No magic strings/URLs: base URL templates are named constants (AGENTS.md rule 23).
- State and progression stay owned by the parent `ListEditor`; children stay presentational
  (AGENTS.md rule 28).
- On future merge to `main`, bump `APP_VERSION` in `src/constants/version.ts` and
  `package.json` (AGENTS.md rule 29).

## Addendum: Auto-open Sidebar from the Game (Card Pre-selection)

### Context

After the dictionary shortcuts shipped, a second gap surfaced in the **edit** flow.
Today there are two distinct flows:

1. **In game**: while viewing a card, the pencil ("Edit deck") button navigates to the
   list editor.
2. **In the editor**: the user opens the sidebar (`DetailDrawer`) by clicking the row
   chevron/expander.

Both already work independently. The expected behavior is to **unify them**: because we
already know which card's `term`/`definition` the user is editing, the sidebar should open
**automatically** on that row when arriving at the editor — no manual chevron click needed.

The association id to pre-select is the **current card in the game** (`currentAssociation`).

### Decision: transport the id via props (Option A)

The pending association id is carried from `GameView` → `App` → `ListEditor` →
`AssociationTable` through props (not the store), keeping the change local to the flow.

### Files Changed (addendum)

- `src/components/views/GameView.tsx`
  - `GameViewProps.onViewList?: () => void` → `onViewList?: (associationId?: string) => void`
  - Pencil button: `onClick={onViewList}` → `onClick={() => onViewList?.(currentAssociation?.id)}`

- `src/App.tsx`
  - Add local state `pendingEditId: string | null`.
  - `onViewList={(id) => { setPendingEditId(id ?? null); navigate('editor'); }}`
  - Pass `initialEditId={pendingEditId}` to `ListEditor` and clear it after rendering.

- `src/components/ListEditor.tsx`
  - Accept `initialEditId?: string | null` and forward it to `AssociationTable` as
    `autoOpenId`, resolving the id across the active (and archived) card lists.

- `src/components/list-editor/AssociationTable.tsx`
  - Add `autoOpenId?: string | null` prop.
  - `useEffect(() => { if (autoOpenId) setExpandedId(autoOpenId); }, [autoOpenId]);`
    opens the sidebar on that row (the rest of the drawer already exists).

### Result

Pinching the pencil in the game opens the list editor with the sidebar already mounted on
the current card, populated with its value and the dictionary shortcuts.

### Conventions (same as base plan)

- Progression and edit persistence stay owned by the parent (`GameView` / `ListEditor`);
  `AssociationTable` only renders the drawer in response to the `autoOpenId` prop
  (AGENTS.md rule 28).
