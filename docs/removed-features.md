# Removed Features

Features deliberately taken out of the app, with the reason. Kept so that a
future change does not re-add them by accident, and so that anyone reading
`docs/SERVICE_CATALOG.md` can find out what happened to a row marked `REMOVED`.

A removal is not a bug fix. Each entry records a decision, not a defect, so these
do not live in `docs/issues/`.

---

## Deck from free text (Gemini)

**Date removed:** 2026-10-12
**Status:** Removed. `createDeckFromText` still exists on the backend, but no
longer has a caller other than the YouTube modal's text mode.

### What was removed

| Piece | Detail |
|---|---|
| `src/components/views/TextImporter.tsx` | 543 lines, the whole review screen |
| `src/App.tsx:424-441` | the `/text-importer` route |
| `src/App.tsx:109` | the `pendingTextImport` state |
| `src/App.tsx:221-262` | the effect that turned that state into a deck |
| `src/types/app.ts:1` | `'text-importer'` from `AppView` |

543 lines plus 5 call sites across 2 files.

### Why

The capability is covered elsewhere. Pasting a text and getting words out of it
is already available at **Nueva Lista → Importar → Extraer Keywords**, which runs
locally in the browser and needs no paid API.

Having a second, parallel path for the same job was the reason for the confusion:
the dashboard advertised two cards (YouTube and Texto Libre) that duplicated
destinations the toolbar and the editor already had.

### How it was sequenced

1. **2026-10-12 — links only.** The two onboarding cards stopped being clickable
   and `onYouTube` / `onTextImport` were removed from the prop chain. The cards
   stayed visible. Reversible in one minute.
2. **2026-10-12 — the real defect first.** Deleting the code before fixing the
   constants would have removed the only way to test the fix, so the eleven
   deleted exports of `constants.js` were restored before any deletion happened.
   See [`issues/done/2026-10-11-constants-rotos-ia-caida.md`](issues/done/2026-10-11-constants-rotos-ia-caida.md).
3. **2026-10-12 — deletion.** With no remaining entry point and the constants
   verified, the component, route, state and effect were removed.

### What was deliberately kept

- `youtubeDeckService.createDeckFromText` and the backend route of the same name.
  `CreateYouTubeDeckModal.tsx:187` uses them for its text mode, which is a
  different flow with its own review UI.
- The `Extract Keywords` local flow in the editor. It is the replacement.

### Verification after removal

```
$ grep -rn "TextImporter|text-importer|pendingTextImport|onTextImport" src/ backend/
  (no results)

npx tsc --noEmit   -> exit 0
npx vitest run     -> 753 passed (59 files)
```

### If you want it back

Restore in the reverse order: re-add the route and component, then re-add
`onTextImport` to the prop chain. Note that the flow needs a real `GEMINI_API_KEY`
to work, and that the Gemini model list restored from history is unverified —
see the "Still open" note in
[`issues/done/2026-10-11-constants-rotos-ia-caida.md`](issues/done/2026-10-11-constants-rotos-ia-caida.md).