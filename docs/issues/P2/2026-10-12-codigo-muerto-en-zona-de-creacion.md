# 500 lines of dead code in the deck-creation zone

**Date:** 2026-10-12
**Priority:** P2 — hygiene
**Status:** Not fixed

## What

Three components in the deck-creation area are unreachable. `CreateListForm`
was never wired to anything, `BulkImportPanel` is only reachable through
`CreateListForm`, and `App.tsx` renders a second `CreateYouTubeDeckModal` whose
state flag is never set to `true`.

## Impact

500 lines of React that no build, no test and no user path can reach. They are
maintained, reviewed and can still break, but nothing detects it.

| Dead code | Lines | Reachable from |
|---|---|---|
| `src/components/views/dashboard/CreateListForm.tsx` | 205 | nothing |
| `src/components/views/dashboard/BulkImportPanel.tsx` | 295 | only `CreateListForm` |
| `App.tsx:473-481` (`CreateYouTubeDeckModal`) | 9 | never opens |

The two dashboards components look like a real alternative to the editor's
`BulkImport`, so a reader can reasonably believe the app has two import paths.
It has one.

## Evidence

```
$ grep -rn "CreateListForm" src/ tests/ | grep -v "CreateListForm.tsx"
src/components/list-editor/BulkImport.tsx:13:
  // Optional keyword extraction mode (for Dashboard CreateListForm)
```

The only hit is a comment. No import.

```
$ grep -rn "BulkImportPanel" src/ tests/ | grep -v "BulkImportPanel.tsx"
src/components/views/dashboard/CreateListForm.tsx:7:import { BulkImportPanel } from "./BulkImportPanel";
src/components/views/dashboard/CreateListForm.tsx:161:        <BulkImportPanel
```

Only the already-dead `CreateListForm` imports it.

```
$ grep -n "showYouTubeModal\|setShowYouTubeModal" src/App.tsx
106:  const [showYouTubeModal, setShowYouTubeModal] = React.useState(false);
473:      {showYouTubeModal && (
475:          onClose={() => setShowYouTubeModal(false)}
477:            setShowYouTubeModal(false);
```

`setShowYouTubeModal` is only ever called with `false`. The modal the
dashboard actually uses is the one rendered by `Dashboard.tsx`, through its own
`showYouTubeModal` state.

## Fix

Delete all three. The editor's `BulkImport` and `Dashboard`'s
`CreateYouTubeDeckModal` are the live implementations and stay.