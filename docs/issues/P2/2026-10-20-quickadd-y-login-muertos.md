# QuickAdd modal and src/pages/Login.tsx are unreachable

**Date:** 2026-10-20
**Status:** Not fixed

## What

Two artefacts exist in the tree and cannot be reached by any user path or test.

1. `QuickAddModal` is rendered by `App.tsx` behind `showQuickAdd`, but `setShowQuickAdd` is only ever called with `false`. The flag has no opener.
2. `src/pages/Login.tsx` (144 lines) is referenced by nothing anywhere in `src/`.

The duplicate `CreateYouTubeDeckModal` in `App.tsx` shows the same pattern and is already filed in `2026-10-12-codigo-muerto-en-zona-de-creacion.md`; this issue covers only the two artefacts that file does not mention.

## Impact

- `QuickAddModal.tsx` plus its `App.tsx` render block are maintained, reviewed and can still break, but no build, test or user path executes them.
- A reader looking for the login flow will find `src/pages/Login.tsx` first, open a 144-line component that is not part of the application, and reason about the wrong entry point.
- Together with the other dead creation-zone code this deepens the false impression that the app has several import paths when it has one.

## Evidence

```
$ grep -rn "showQuickAdd\|setShowQuickAdd" src/
src/App.tsx:103:  const [showQuickAdd, setShowQuickAdd] = React.useState(false);
src/App.tsx:370:      {showQuickAdd && (
src/App.tsx:375:          onClose={() => setShowQuickAdd(false)}

$ grep -rn "pages/Login\|from './Login'" src/
(no results)

$ wc -l src/pages/Login.tsx
144 src/pages/Login.tsx

$ find src -name "QuickAdd*"
src/components/modals/QuickAddModal.tsx
```

## Fix

Either wire `showQuickAdd` to a real entry point (a toolbar action or a keyboard shortcut) or delete `src/components/modals/QuickAddModal.tsx` and the block at `src/App.tsx:370-376`. Delete `src/pages/Login.tsx`; the live entry point is `src/components/Auth.tsx` routed at `/login`.
