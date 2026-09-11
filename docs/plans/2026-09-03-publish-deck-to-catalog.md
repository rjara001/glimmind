# Plan: Publicar Mazo al Catálogo Global

**Date:** 2026-09-03
**Status:** Draft
**Priority:** High

---

## Objective

Allow users to share their personalized decks with the global community after passing a validation flow that guarantees content quality and safety. The flow surfaces three signals (pre-flight checks, AI moderation, publishing form) and rejects publish attempts that fail any guardrail (item count, completion, duplicates, moderation status, terms acceptance).

The publication UI is a single screen that matches the reference HTML: a header, a checklist of validations, a form (name, category, description, tags), a moderation result tile, a terms checkbox, and a primary "PUBLICAR AL CATÁLOGO GLOBAL" button.

---

## Current State

### Where decks live today

- **User's own decks** are stored in Firestore under `users/{uid}/lists/{listId}` (`backend/src/functions/src/services/listService/crud.js:51-67`).
- **Prebuilt (global) decks** are stored in the top-level `prebuiltDecks` collection and served via the `getPrebuiltDecks` callable function (`backend/src/functions/src/services/prebuiltDeckService.js:3-10`, `backend/src/functions/src/routes/deckRoutes.js:3-9`).
- The prebuilt-deck schema (`src/types/prebuilt-deck.ts`) supports fields like `id`, `name`, `category`, `description`, `icon`, `order`, `active`, `associations`. There is **no** `moderationStatus`, `publishedBy`, `tags`, or `submittedAt` field.

### What's missing

1. **No "publish" affordance**: there is no entry point in `Dashboard.tsx`, `ListEditor.tsx`, or `ListCard.tsx` to submit a user list to the global catalog.
2. **No completion tracking**: `AssociationList` has no `progress.completed` / `history.completedAt` field. The engine finishes individual game sessions (`gameEngine.ts:490, 553` sets `state.isFinished = true`), but **the list itself never records "completed at least once"** — this needs to be added (see Section 5).
4. **No backend moderation pipeline**: there are no collections, callable routes, or scheduled jobs that scan content, mark items for review, or reject duplicates. The reference HTML's moderation step is currently a 2-second client-side simulation.
5. **No Firestore rules for a "pending submissions" collection**: rules currently restrict writes to `users/{uid}` (`firestore.rules:5`).

### Available infrastructure to reuse

| Capability | Location |
|---|---|
| Backend callable HTTP function (cors-enabled, `Authorization: Bearer`) | `backend/src/functions/src/utils/helpers.js:requireAuth` |
| Card count + quota checks | `backend/src/functions/src/services/listService/quota.js` |
| AI moderation (Gemini) | `backend/src/functions/src/services/aiService` (used today by vocabulary extraction) |
| Prebuilt deck fetch | `prebuiltDeckService.fetchDecks` (`src/services/prebuiltDeckService.ts`) |
| Call-function helper (auth, JSON, error handling) | `src/services/callFunction.ts` |
| Toast notifications | `src/components/layout/Toast.tsx` |
| Existing user deck CRUD | `backend/src/functions/src/routes/listRoutes.js` |

---

## Design

### 1. Backend — `submitDeckToCatalog` callable function

**New file:** `backend/src/functions/src/routes/catalogRoutes.js`

A callable HTTPS function that accepts a user's `listId`, runs the moderation pipeline (Section 4), persists the deck to `prebuiltDecks` (or a `pendingSubmissions` collection if manual review is required), and returns the moderation result to the client.

```js
const { onRequest } = require("firebase-functions/v2/https");
const { getDb, FieldValue } = require("../utils/firebase");
const { requireAuth } = require("../utils/helpers");
const { fetchListByIdForUser } = require("../services/listService");
const { moderateDeckContent } = require("../services/moderationService");

exports.submitDeckToCatalog = onRequest({ cors: true }, async (req, res) => {
  const uid = await requireAuth(req, res);
  if (!uid) return;

  const { listId, name, category, description, tags } = req.body || {};
  if (!listId || !name || !category) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const list = await fetchListByIdForUser(getDb(), listId, uid);

    // Pre-flight checks (mirror the HTML checklist)
    const cardCount = list.associations?.length || 0;
    if (cardCount < 10 || cardCount > 500) {
      res.status(400).json({ code: "OUT_OF_RANGE", detail: `El mazo debe tener entre 10 y 500 tarjetas (tiene ${cardCount}).` });
      return;
    }
    if (!list.history?.completedAt) {
      res.status(400).json({ code: "NOT_COMPLETED", detail: "Debes completar el mazo al 100% al menos una vez antes de publicarlo." });
      return;
    }

    // Moderation pipeline (Section 4)
    const moderation = await moderateDeckContent(list, { name, description, tags });
    if (moderation.rejected > 0 && moderation.approved + moderation.review === 0) {
      res.status(422).json({ code: "REJECTED", detail: "El contenido fue rechazado por la moderación.", moderation });
      return;
    }

    // Duplicate detection (Section 4.3)
    const duplicate = await findDuplicateByContent(getDb(), list.associations);
    if (duplicate) {
      res.status(409).json({ code: "DUPLICATE", detail: `Ya existe un mazo global similar: "${duplicate.name}".` });
      return;
    }

    // Persist (Section 6)
    const targetCollection = moderation.review > 0 ? "pendingSubmissions" : "prebuiltDecks";
    const docRef = getDb().collection(targetCollection).doc();
    const deckDoc = {
      id: docRef.id,
      name,
      category,
      description: description ?? list.concept ?? "",
      icon: "📘",
      order: 999,
      active: moderation.review === 0,
      tags: Array.isArray(tags) ? tags : [],
      associations: list.associations,
      publishedBy: uid,
      publishedAt: FieldValue.serverTimestamp(),
      moderation,
      sourceListId: listId,
    };
    await docRef.set(deckDoc);

    res.json({ ok: true, deckId: docRef.id, moderation, collection: targetCollection });
  } catch (error) {
    console.error("[submitDeckToCatalog]", error);
    res.status(500).json({ error: error.message });
  }
});
```

**New file:** `backend/src/functions/src/services/moderationService.js`

Pure service that runs the three-stage moderation pipeline (keyword filter → AI classification → duplicate check). See Section 4.

### 2. Frontend service — `catalogService`

**New file:** `src/services/catalogService.ts`

```ts
import { callFunction } from './callFunction';
import type { ModerationResult } from '../types/catalog';

export interface PublishDeckRequest {
  listId: string;
  name: string;
  category: string;
  description?: string;
  tags?: string[];
}

export interface PublishDeckResponse {
  ok: boolean;
  deckId: string;
  moderation: ModerationResult;
  collection: 'prebuiltDecks' | 'pendingSubmissions';
}

export const catalogService = {
  submitDeck: async (req: PublishDeckRequest): Promise<PublishDeckResponse> => {
    return await callFunction<PublishDeckResponse>('submitDeckToCatalog', req);
  },
};
```

### 3. Frontend types

**New file:** `src/types/catalog.ts` (per AGENTS.md rule 7, no types in components):

```ts
export type ModerationLevel = 'approved' | 'review' | 'rejected';

export interface ModerationResult {
  approved: number;
  review: number;
  rejected: number;
  flaggedItems: { index: number; reason: string }[];
  level: ModerationLevel;  // worst-case overall level
}

export type DeckCategory = PrebuiltDeckCategory | 'Languages' | 'Science' | 'History' | 'Art' | 'Technology' | 'Other';

export interface PublishValidationState {
  completedAt: boolean;
  cardCountOk: boolean;
  moderationPending: boolean;
  moderationDone: boolean;
  termsAccepted: boolean;
  hasDuplicate: boolean;
}
```

### 4. Moderation Pipeline

#### 4.1 Stage 1 — Keyword filter (`moderationService.js`)

A fast, deterministic filter that scans every association's `term` + `definition` strings and the user-supplied `name`/`description`/`tags` against a list of banned keywords grouped by category. Per AGENTS.md rule 23, the keyword lists live in `backend/src/functions/src/utils/moderationKeywords.js`:

```js
const BANNED_KEYWORDS = {
  POLITICS: ['política', 'gobierno', 'dictador', 'presidente', 'elección', 'partido político'],
  ADULT:    ['explícito', 'sexual', 'desnudo', '+18', 'pornografía', 'erótico'],
  VIOLENCE: ['violencia', 'sangre', 'muerte', 'asesinato', 'tortura', 'arma'],
  HATE:     ['discriminación', 'racismo', 'homofobia', 'xenofobia', 'supremacía'],
};

function scanForBannedKeywords(text) {
  const lower = text.toLowerCase();
  const matched = [];
  for (const [category, words] of Object.entries(BANNED_KEYWORDS)) {
    for (const word of words) {
      if (lower.includes(word)) matched.push({ category, word });
    }
  }
  return matched;
}
```

Any keyword match → flagged as `review`.

#### 4.2 Stage 2 — AI classification (Gemini)

For decks that pass Stage 1, send a compact prompt to Gemini (reuse `GEMINI_MODELS` from `constants.js:12` and the same retry pattern used in `aiService`). The prompt returns a per-item label (`approved` / `review` / `rejected`) for ambiguous cases. This mirrors the reference HTML's "moderación por IA" tile.

If the AI call fails (rate-limit, network), fall back to `approved` for all items and log a warning — **never block publishing on AI errors**.

#### 4.3 Stage 3 — Duplicate detection (`findDuplicateByContent`)

Compare the deck's normalized terms against every `prebuiltDecks` collection document using the same Levenshtein similarity logic already used in `src/utils/deckValidation.ts` (called from `src/hooks/dashboard/useDeckValidation.ts`). If any global deck shares ≥80% of its terms with the user's deck, return it as a duplicate. To avoid loading every prebuilt deck on every submit, the function caches a snapshot in-memory for the duration of a single cold start (Cloud Function instances are warm for ~15 min).

The keyword list, threshold (0.80), and exact-match normalization helper (`normalize` from `src/utils/similarity.ts`) live in **constants**, not inside the function — per AGENTS.md rule 23.

### 5. List completion tracking

The plan currently relies on `list.progress.completed` / `list.history.completedAt`, but neither field exists on `AssociationList` today. We need to add it before publishing can work.

**New file:** `backend/src/functions/src/routes/listRoutes.js` — extend the existing `saveProgress` / `updateList` handlers to write `history.completedAt = FieldValue.serverTimestamp()` whenever the engine reports a 100% cycle completion. This logic is added inside the same transaction that increments the goal counter (see `useGameLogic.ts:187` and `progressService.ts:14-16`).

**New field on `AssociationList`** (`src/types.ts:48-83`):

```ts
export interface AssociationList {
  // ... existing fields ...
  history?: {
    completedAt?: number;     // epoch ms of first 100% completion
    lastCompletedAt?: number; // most recent 100% completion
    completedCount?: number;  // total sessions completed
  };
}
```

A small hook in `src/hooks/game/useGameLogic.ts` watches `gameState.isFinished` + `summary.learned === list.associations.length` and dispatches `markListCompleted(listId)` via the existing `progressService.saveProgress` channel (it already runs on a debounced timer — `src/services/progressService.ts:52-67`).

This change is minimal and contained: it adds three optional fields to `AssociationList`, one line in the progress save handler, and one memoized effect in `useGameLogic`. **No existing call sites need to change** because the fields are optional.

### 6. Firestore schema

| Collection | Purpose | Writes |
|---|---|---|
| `prebuiltDecks` (existing) | Approved and published decks | Cloud Function `submitDeckToCatalog` |
| `pendingSubmissions` (new) | Decks awaiting manual review (any item flagged `review`) | Same function |
| `rejectedSubmissions/{uid}/{submissionId}` (new) | Rejected decks (audit log) | Same function |

Updated **Firestore rules** (`firestore.rules`):

```rules
match /prebuiltDecks/{deckId} {
  allow read: if true;  // public catalog
  allow write: if false; // only Cloud Functions can write
}

match /pendingSubmissions/{submissionId} {
  allow read: if request.auth != null && request.auth.uid == resource.data.publishedBy;
  allow write: if false;
}

match /rejectedSubmissions/{uid}/{submissionId} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

Cloud Functions use the Admin SDK and bypass these rules.

### 7. Frontend — `PublishDeckScreen` component

**New file:** `src/components/deck/PublishDeckScreen.tsx`

The main publishing UI. Mirrors the reference HTML structure exactly: header → checklist → form → moderation tile → terms checkbox → primary action → secondary cancel.

**Props:**

```ts
interface PublishDeckScreenProps {
  list: AssociationList;
  onCancel: () => void;
  onPublished: (deckId: string) => void;
}
```

**State:**

```ts
const [moderation, setModeration] = useState<ModerationResult | null>(null);
const [moderationPending, setModerationPending] = useState(true);
const [termsAccepted, setTermsAccepted] = useState(true); // checked by default in reference
const [publishing, setPublishing] = useState(false);
const [name, setName] = useState(list.name);
const [category, setCategory] = useState('Other');
const [description, setDescription] = useState(list.concept ?? '');
const [tags, setTags] = useState('');
```

**Derived checks (memoized):**

```ts
const cardCount = list.associations.length;
const isCompleted = Boolean(list.history?.completedAt);
const minOk = cardCount >= 10;
const maxOk = cardCount <= 500;
const moderationPassed = moderation !== null && moderation.rejected === 0;
const canPublish = isCompleted && minOk && maxOk && moderationPassed && termsAccepted && !moderationPending;
```

**Rendering (matching reference HTML layout, but using Tailwind like the rest of the project):**

1. **Header**: `📤 Publicar mazo: "<deckName>"` + badge `{cardCount} tarjetas`.
2. **Checklist** (3 items, mirroring the reference's `pass` / `pending` / `fail` classes):
   - `✅ Has completado este mazo al 100% al menos una vez` (pass/fail based on `list.history?.completedAt`).
   - `✅ Tiene {cardCount} tarjetas (mínimo 10, máximo 500)` (pass if 10–500, otherwise fail with red).
   - `⏳ El contenido está siendo moderado por IA...` → transitions to pass once moderation finishes.
3. **Form** (pre-filled from the list):
   - `Nombre del mazo` (text input)
   - `Categoría` (select with options matching `PrebuiltDeckCategory` plus `Languages | Science | History | Art | Technology | Other`)
   - `Etiquetas` (text input, comma or space separated, parsed to `string[]` on submit)
   - `Descripción` (textarea, pre-filled from `list.concept`)
4. **Moderation tile** (3 stat cards: `✅ Aprobadas`, `⚠️ Revisión`, `❌ Rechazadas`). Hidden until moderation completes (or show a skeleton).
5. **Terms checkbox**: pre-checked, required.
6. **Primary button**: `📤 PUBLICAR AL CATÁLOGO GLOBAL` — disabled until `canPublish`. While `publishing`, shows `⏳ Publicando...`.
7. **Secondary button**: `Cancelar` — calls `onCancel()` and toasts `📋 Publicación cancelada.`
8. **Toast feedback** matches the reference HTML exactly: `✅ ¡Mazo publicado exitosamente al catálogo global!` on success, `❌ Error al publicar el mazo.` on failure (see `src/components/layout/Toast.tsx`).

**Effect — kick off moderation on mount:**

```ts
useEffect(() => {
  let cancelled = false;
  catalogService.moderate(list).then((result) => {
    if (!cancelled) {
      setModeration(result);
      setModerationPending(false);
    }
  });
  return () => { cancelled = true; };
}, [list]);
```

### 8. Entry point — wire `PublishDeckScreen` into the dashboard

**Modified file:** `src/components/views/dashboard/BigListsGrid.tsx` (or `ListCard.tsx`)

Add a "📤 Publicar al catálogo global" button on each list card that opens `PublishDeckScreen` in a modal. The button is disabled (with a tooltip) if `list.history?.completedAt` is missing.

**Modified file:** `src/components/views/Dashboard.tsx`

Hold `publishingList` state; render `<PublishDeckScreen>` as a full-screen overlay when set.

**Modified file:** `src/components/views/GameView.tsx` (optional, second entry point)

Add a "📤 Publicar al catálogo global" button in the post-game `FinishedScreen` once the deck is finished. The button reuses the same `PublishDeckScreen` component.

### 9. Constants

**New file:** `src/constants/publishDeck.ts` (per AGENTS.md rule 23):

```ts
export const PUBLISH_MIN_CARDS = 20;
export const PUBLISH_MAX_CARDS = 120;
export const PUBLISH_DUPLICATE_SIMILARITY = 0.80;
export const PUBLISH_DEBOUNCE_MS = 300;
```

Mirror constants on the backend in `backend/src/functions/src/utils/constants.js`:

```js
const PUBLISH_MIN_CARDS = 20;
const PUBLISH_MAX_CARDS = 120;
const PUBLISH_DUPLICATE_SIMILARITY = 0.80;
```

### 10. Tests

#### 10a. Backend unit tests for moderation

**New file:** `tests/backend/moderationService.test.js` (vitest, mocking the Firestore admin SDK):

- Keyword filter: any of the 4 banned categories produces at least one `review` flag.
- AI fallback: when `gemini` is mocked to throw, every item is `approved` (never crashes the request).
- Duplicate detection: 90% overlap with an existing `prebuiltDecks` doc returns that doc; <50% overlap returns `null`.

#### 10b. Frontend component tests

**New file:** `tests/components/deck/PublishDeckScreen.test.tsx`:

- Renders the header with the deck name and card count.
- Shows three checklist items, one pass, one pass, one pending on first render.
- Pre-fills the form with `list.name`, `list.concept`, and an empty tag input.
- Disables the primary button while moderation is pending.
- Toggles `termsAccepted` enables/disables the button.
- Calls `catalogService.submitDeck` with the right payload on click.
- Shows the success toast on a 2xx response and `onPublished(deckId)`.
- Shows the error toast on a 4xx/5xx response and does NOT close the screen.

#### 10c. Frontend service test

**New file:** `tests/services/catalogService.test.ts`:

- Calls `callFunction('submitDeckToCatalog', …)` with the exact payload shape.
- Forwards auth header (mocked).
- Surfaces `code`, `detail`, `fallbackAvailable` errors.

### 11. Version Bump

Per AGENTS.md rule 29, bump version in both files:

- `src/constants/version.ts`: `APP_VERSION` → `'1.24.0'`
- `package.json`: `"version"` → `"1.24.0"`

This is a **minor** bump (new feature).

---

## Files to Add

| File | Purpose |
|---|---|
| `backend/src/functions/src/routes/catalogRoutes.js` | New `submitDeckToCatalog` callable function |
| `backend/src/functions/src/services/moderationService.js` | Three-stage moderation pipeline |
| `backend/src/functions/src/utils/moderationKeywords.js` | Banned keyword lists (politics / adult / violence / hate) |
| `src/services/catalogService.ts` | Frontend client wrapper for the callable function |
| `src/types/catalog.ts` | `ModerationResult`, `DeckCategory`, `PublishValidationState` |
| `src/constants/publishDeck.ts` | Frontend publish-deck constants (min/max cards, similarity, debounce) |
| `src/components/deck/PublishDeckScreen.tsx` | Main publishing UI |
| `tests/backend/moderationService.test.js` | Moderation pipeline unit tests |
| `tests/components/deck/PublishDeckScreen.test.tsx` | Component tests |
| `tests/services/catalogService.test.ts` | Service-level tests |
| `docs/plans/2026-09-03-publish-deck-to-catalog.md` | This plan |

## Files to Modify

| File | Change |
|---|---|
| `firestore.rules` | Add `prebuiltDecks`, `pendingSubmissions`, `rejectedSubmissions` rules |
| `src/types.ts` | Add optional `history?: { completedAt, lastCompletedAt, completedCount }` to `AssociationList` |
| `src/hooks/game/useGameLogic.ts` | Memoized effect: when `gameState.isFinished && summary.learned === list.associations.length`, dispatch completion marker through `progressService` |
| `src/services/progressService.ts` | Extend `UserProgress` save payload to include list completion markers (optional) |
| `src/components/views/Dashboard.tsx` | Add `publishingList` state + render `<PublishDeckScreen>` overlay |
| `src/components/views/dashboard/BigListsGrid.tsx` (or `ListCard.tsx`) | Add "📤 Publicar al catálogo global" button per list |
| `src/components/game/FinishedScreen.tsx` | Add "📤 Publicar al catálogo global" CTA on a finished game (optional entry point) |
| `src/constants/version.ts` | Bump to `1.24.0` |
| `package.json` | Bump to `1.24.0` |

---

## Decision: Where Validation Runs

Per AGENTS.md rule 31 ("Inspection First") and rule 31 ("No Parallel Engines or Flags"), the pre-flight checks (item count, completion, terms) live **client-side** in `PublishDeckScreen`, while moderation and duplicate detection live **server-side** in `submitDeckToCatalog`. The client cannot be trusted (a malicious user could bypass UI guards), so the function **re-validates** the same conditions before persisting.

There is no `isEngineActive` toggle or parallel moderation path — the function is the single authoritative validator. Client-side checks exist only to give the user fast feedback (no network round-trip needed for the obvious cases).

---

## Validation & Acceptance

1. **Type-check:** `npx tsc --noEmit` passes.
2. **Unit tests:** `npx vitest run tests/backend/moderationService.test.js tests/components/deck/PublishDeckScreen.test.tsx tests/services/catalogService.test.ts` — all pass.
3. **Manual flow (with emulators per AGENTS.md rule 30):**
   1. `npm run emulators` (uses `--import .emulator-data --export-on-exit .emulator-data`).
   2. Sign in, create a list with ≥10 cards, finish it once at 100%.
   3. From `BigListsGrid`, click "📤 Publicar al catálogo global".
   4. Confirm checklist shows two green ticks and the moderation tile animates from pending → results.
   5. Edit the name/tags/description, click **PUBLICAR**.
   6. Toast: `✅ ¡Mazo publicado exitosamente al catálogo global!`.
   7. In the Firestore emulator UI, verify a new `prebuiltDecks/{deckId}` document exists.
   8. Reload the deck store — the new deck appears.
4. **Negative paths:**
   - List with <10 cards → button disabled with red checklist item + tooltip `Mínimo 10 tarjetas`.
   - List never finished → button disabled with red checklist item + tooltip `Completá el mazo al menos una vez antes de publicarlo.`
   - Deck containing a banned keyword (e.g., definition includes "violencia") → moderation tile shows ≥1 `Revisión` item; deck is written to `pendingSubmissions` instead of `prebuiltDecks`.
   - Submitting twice with the same content → second submit returns 409 with `code: "DUPLICATE"` and toast `⚠️ Ya existe un mazo global similar: "..."`.
   - Unchecking the terms checkbox → primary button disabled.
5. **Responsive:** the screen collapses to a single-column layout below 600px (same breakpoint as the reference HTML's `@media (max-width: 600px)`).

---

## Non-Goals

- No in-place edit of a published deck (publishing creates a new `prebuiltDecks` doc; updates would be a separate feature).
- No community reports / takedowns UI (rejected submissions are stored in `rejectedSubmissions` for audit but no end-user surface).
- No images/icons picker beyond a static default emoji.
- No multi-language description translation.
- No scheduled re-moderation of already-published decks.
- No versioning of an already-published deck (publishing the same list twice always fails the duplicate check).