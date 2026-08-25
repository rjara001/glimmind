# Onboarding "Deck Store" — Implementation Plan

## 1. Problem Statement

When `lists.length === 0`, the Dashboard currently shows:

- Hero banner with 4 metrics all at 0 → no perceived value
- GoalWidget with empty ring → no context
- Quota bar unused → no relevance
- Minimal empty state: "No hay listas aun" → no clear direction

The user arrives and doesn't know what to do or why they should do it.

---

## 2. Solution: "Deck Store" Onboarding

Replace the empty Dashboard with a **store-like experience** where the user:

1. Sees a welcome banner
2. Browses a catalog of prebuilt decks (stored in Firestore)
3. Previews vocabulary before committing
4. Adds a deck to their space with 1 click → goes directly to play mode
5. Can also create custom lists via the existing creation flow

### Architecture Overview

```
Frontend (DeckStoreOnboarding)
  ↓ fetchDecks()
prebuiltDeckService.ts → callFunction('getPrebuiltDecks', {})
  ↓ HTTP POST
Cloud Function getPrebuiltDecks (deckRoutes.js)
  ↓ Admin SDK
Firestore collection: prebuiltDecks (where active==true, orderBy order)
  ↓ JSON response
Frontend renders catalog → User clicks "Agregar a mi Espacio"
  ↓
createListCore() → persists to Zustand + Firestore
  ↓
handlePlayList() → navigates to GameView
```

---

## 3. Data Model

### Firestore Collection: `prebuiltDecks/{deckId}`

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | "Vocabulario Casual & Modismos" |
| `concept` | string | "Ingles / Espanol" |
| `category` | string | "Casual" \| "Pop Culture" \| "Music" \| "Travel" \| "Work" |
| `description` | string | Short pitch for the deck |
| `icon` | string | Emoji icon |
| `order` | number | Display order (1, 2, 3, 4) |
| `active` | boolean | true (allows soft-disable) |
| `associations` | array | `[{ term: string, definition: string }, ...]` |

### Initial Decks (4)

| # | Icon | Name | Category | Cards |
|---|------|------|----------|-------|
| 1 | 🗣️ | Vocabulario Casual & Modismos | Casual | 20 |
| 2 | 🛍️ | En el Shopping & Tiendas | Travel | 20 |
| 3 | 📺 | Dialogos de Friends (La Serie) | Pop Culture | 20 |
| 4 | 🎵 | Lirica: Michael Jackson (Thriller) | Music | 15 |

---

## 4. Onboarding Layout (Top → Bottom)

### 4A. Welcome Banner

```
┌──────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░ gradient indigo→purple ░░░░░░░░░░░░░░  │
│                                                      │
│   ¡Bienvenido a tu Tienda de Barajas!                │
│                                                      │
│   Explora nuestro catalogo, revisa las tarjetas y    │
│   cargalas a tu espacio en 1 clic.                   │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- `bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-8 shadow-lg`
- Title: `text-2xl font-bold text-white`
- Subtitle: `text-white/80 text-sm`

### 4B. Deck Catalog (Product Grid)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────┐ │
│  │ 🗣️           │ │ 🛍️           │ │ 📺           │ │ 🎵  │ │
│  │ Casual       │ │ Travel       │ │ Pop Culture  │ │Music│ │
│  │              │ │              │ │              │ │     │ │
│  │ Vocabulario  │ │ En el        │ │ Dialogos de  │ │Liric│ │
│  │ Casual &     │ │ Shopping &   │ │ Friends      │ │a: MJ│ │
│  │ Modismos     │ │ Tiendas      │ │              │ │     │ │
│  │              │ │              │ │              │ │     │ │
│  │ 20 tarjetas  │ │ 20 tarjetas  │ │ 20 tarjetas  │ │15   │ │
│  │              │ │              │ │              │ │     │ │
│  │ [Previsual]  │ │ [Previsual]  │ │ [Previsual]  │ │[Prev│ │
│  │ [Agregar]    │ │ [Agregar]    │ │ [Agregar]    │ │[Agg]│ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

- Grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8`
- Each card: `bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition`
- Badge: `bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider`
- "Previsualizar" button: `border border-gray-200 text-gray-700 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-gray-50 transition w-full py-2.5`
- "Agregar a mi Espacio" button: `bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-indigo-700 active:scale-95 transition w-full py-2.5`

### 4C. Custom Creation Section

```
┌──────────────────────────────────────────────────────┐
│  ┄┄┄┄┄┄┄ border-dashed border-indigo-200 ┄┄┄┄┄┄┄┄┄  │
│                                                      │
│  🛠️ ¿Preferis cargar tu propio material?             │
│  Crea tu propia lista con el metodo que prefieras.   │
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐             │
│  │ 📋 CSV   │ │ 🤖 IA    │ │ ✍️ Manual│             │
│  │ Copiar y │ │ Popular  │ │ Formular │             │
│  │ Pegar    │ │ badge    │ │ io dir.  │             │
│  └──────────┘ └──────────┘ └──────────┘             │
│                                                      │
│        [ + Crear Lista Personalizada ]               │
│                                                      │
└──────────────────────────────────────────────────────┘
```

- Container: `border-2 border-dashed border-indigo-200 bg-slate-50 rounded-2xl p-8`
- 3 method cards in `grid grid-cols-1 sm:grid-cols-3 gap-4`
- Each: `bg-white rounded-xl p-4 border border-gray-100`
- "Popular" badge: `bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded`
- CTA: `bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 active:scale-95 transition`

### 4D. Preview Modal

```
┌──────────────────────────────────────────────────────┐
│  ░░░░░░░░░░░ header: bg-indigo-600 ░░░░░░░░░░░░░░░  │
│  │ 🗣️  Vocabulario Casual & Modismos           ✕  │
│  │ Dominá las expresiones del día a día...          │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  Término              │  Definición           │    │
│  │───────────────────────│───────────────────────│    │
│  │  What's up?           │  ¿Qué tal?            │    │
│  │  I'm down             │  Estoy de acuerdo     │    │
│  │  No brainer           │  No hay que pensarlo  │    │
│  │  ...                  │  ...                  │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [Cancelar]           [🛒 Agregar a mi Espacio]     │
└──────────────────────────────────────────────────────┘
```

- Backdrop: `fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200]`
- Container: `bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95`
- Header: `p-6 sm:p-8 bg-indigo-600 text-white`
- Body: `p-6 sm:p-8 bg-slate-50 max-h-[50vh] overflow-y-auto`
- Footer: `p-6 sm:p-8 bg-white border-t`

---

## 5. User Flow

```
Registration/Login
    ↓
Dashboard (isFirstTime = true, lists.length === 0)
    ↓
DeckStoreOnboarding mounts → fetchPrebuiltDecks() → Firestore
    ↓
Welcome banner + 4 deck cards rendered
    ↓
User clicks "👁️ Previsualizar" → DeckPreviewModal (vocabulary table)
    ↓
User clicks "🛒 Agregar a mi Espacio"
    ↓
Converts deck.associations → Association[] (UUIDs, cycle 1, pending)
    ↓
handleCreateListAndPlay → createListCore (persists to store + Firestore)
    ↓
handlePlayList → navigates to GameView → user starts reviewing
    ↓
User returns to Dashboard → lists.length > 0 → normal Dashboard with real metrics
```

---

## 6. Micro-copy (Spanish)

| Location | Text |
|----------|------|
| **Banner title** | `¡Bienvenido a tu Tienda de Barajas!` |
| **Banner subtitle** | `Explorá nuestro catálogo, revisá las tarjetas y cargalas a tu espacio en 1 clic.` |
| **Deck card "Preview" btn** | `👁️ Previsualizar` |
| **Deck card "Add" btn** | `🛒 Agregar a mi Espacio` |
| **Modal header desc** | Deck's description from Firestore |
| **Modal footer primary** | `🛒 Agregar esta baraja a mi espacio` |
| **Modal footer secondary** | `Cancelar` |
| **Custom section title** | `🛠️ ¿Preferís cargar tu propio material?` |
| **Custom section subtitle** | `Creá tu propia lista con el método que prefieras.` |
| **Method 1** | `📋 CSV / Copiar y Pegar` — "Pegá desde Excel o Google Sheets" |
| **Method 2** | `🤖 Generar con IA` — badge "Popular" |
| **Method 3** | `✍️ Carga Manual` — "Formulario directo término por término" |
| **Custom CTA** | `+ Crear Lista Personalizada` |
| **Toast on add** | `"¡{deck.name}" agregada a tu espacio"` — implemented in DeckStoreOnboarding |

---

## 7. Files to Create/Modify

### New Files (9)

| # | File | Layer | Purpose |
|---|------|-------|---------|
| 1 | `backend/src/functions/src/services/prebuiltDeckService.js` | Backend | Firestore read for prebuiltDecks collection |
| 2 | `backend/src/functions/src/routes/deckRoutes.js` | Backend | Cloud Function `getPrebuiltDecks` |
| 3 | `scripts/seedPrebuiltDecks.ts` | Script | Insert 4 decks into Firestore |
| 4 | `src/types/prebuilt-deck.ts` | Frontend | `PrebuiltDeck` interface + `DeckCategory` type |
| 5 | `src/services/prebuiltDeckService.ts` | Frontend | `fetchDecks()` via `callFunction` |
| 6 | `src/components/onboarding/DeckCard.tsx` | Frontend | Deck product card component |
| 7 | `src/components/onboarding/DeckPreviewModal.tsx` | Frontend | Preview modal with vocabulary table |
| 8 | `src/components/onboarding/CustomCreationSection.tsx` | Frontend | Custom creation methods section |
| 9 | `src/components/onboarding/DeckStoreOnboarding.tsx` | Frontend | Main onboarding orchestrator |

### Modified Files (4)

| # | File | Change |
|---|------|--------|
| 10 | `backend/src/functions/index.js` | +2 lines: import + loadRoutes for deckRoutes |
| 11 | `src/hooks/app/useAppActions.ts` | +8 lines: new `handleCreateListAndPlay` function |
| 12 | `src/components/views/Dashboard.tsx` | +20 lines: import, new prop, early return with `isFirstTime` |
| 13 | `src/App.tsx` | +1 line: pass `onCreateAndPlay` prop to Dashboard |

---

## 8. Key Technical Decisions

1. **Firestore via Cloud Function** — follows existing architecture (all data access through Admin SDK, not client-side)
2. **No auth required for getPrebuiltDecks** — public content, any user (guest or authenticated) can browse
3. **`handleCreateListAndPlay`** — new function that chains `createListCore` → `handlePlayList`, navigating directly to GameView instead of editor
4. **`isFirstTime` computed as `lists.length === 0`** — simple, derived from existing store state, no new persisted flag
5. **Seed script** — `scripts/seedPrebuiltDecks.ts` using Firebase Admin SDK, idempotent (checks by name before insert)
6. **Reuse existing patterns** — modal classes from QuickAddModal, card classes from BigListCard, gradient from Dashboard hero, toast from useToast

---

## 9. Seed Script Details

`scripts/seedPrebuiltDecks.ts`:

- Uses Firebase Admin SDK (`firebase-admin/app`, `firebase-admin/firestore`)
- Reads service account credentials from environment or local file
- Project ID: from `firebase.json` or hardcoded `demo-glimmind`
- Collection: `prebuiltDecks`
- Idempotent: checks if deck with same `name` exists before inserting
- Run with: `npx tsx scripts/seedPrebuiltDecks.ts`

Each deck includes full vocabulary data (~20 real Spanish/English pairs per deck).
