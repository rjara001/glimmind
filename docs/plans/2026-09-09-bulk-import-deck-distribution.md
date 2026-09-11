# Bulk Import Deck Distribution UI Improvement

## Overview

Improve the bulk import validation screen to show deck distribution when the number of imported cards exceeds the user's `maxCardsPerDeck` setting. This matches the HTML mockup provided and integrates with the existing auto-split feature.

## Current State

- `splitAssociationsByMax()` exists in `src/utils/splitAssociations.ts` and is used for YouTube/text imports
- `ImportValidationModal` shows card categorization (existing/similar/new) but NOT deck distribution
- `DeckValidationScreen` is for prebuilt decks and also lacks deck distribution
- Users cannot preview how their cards will be split across decks before importing

## Target State

When a user imports bulk cards (CSV/text) and the total exceeds `maxCardsPerDeck`:
1. Show a "Distribución en decks" section with:
   - Each deck name (e.g., "Pepito", "Pepito-2", "Pepito-3")
   - Card count per deck
   - Visual progress bar showing fill percentage
   - Limit indicator (e.g., "Límite: 100 tarjetas por deck")
2. Update the main action button to show:
   - Total cards and deck count
   - Deck breakdown in subtext
3. Reuse existing components: `DeckAnalysisStats`, `DeckCategorySelector`

## Implementation Plan

### Phase 1: Create DeckDistributionList Component
**File**: `src/components/onboarding/DeckDistributionList.tsx` (new)

Props:
- `deckItems`: Array of `{ name: string; count: number; max: number }`
- `limit`: number (max cards per deck)
- `maxVisible`: number (default 5)

Features:
- Horizontal bar chart showing fill percentage
- Color-coded bars (indigo/blue/emerald/amber/slate palette)
- Responsive design (collapses on mobile)
- Shows "Pepito", "Pepito-2", "Pepito-3" style names
- Comportamiento con muchos decks:
  - Si hay más de 5 decks, mostrar scroll vertical (max-height: 240px)
  - Si hay más de 10 decks, colapsar y mostrar "Ver todos" toggle
- Accesibilidad:
  - aria-label en cada barra: "Deck Pepito-2: 100 de 100 tarjetas"
  - role="progressbar" con aria-valuenow, aria-valuemin, aria-valuemax

### Phase 2: Enhance ImportValidationModal
**File**: `src/components/onboarding/ImportValidationModal.tsx`

Add:
- Accept `maxCardsPerDeck` prop (default: `MAX_CARDS_PER_DECK` from `src/constants/limits.ts`)
- Compute deck distribution using `splitAssociationsByMax`
- Render `<DeckDistributionList>` when total > maxCardsPerDeck
- Update button text to include deck count and breakdown

### Phase 3: Update DeckStoreOnboarding
**File**: `src/components/onboarding/DeckStoreOnboarding.tsx`

Pass `maxCardsPerDeck` from user settings to `ImportValidationModal`:

```ts
// Fallback al default si no hay settings
const maxCardsPerDeck = userSettings?.maxCardsPerDeck ?? MAX_CARDS_PER_DECK;
```

Implementation:
```tsx
maxCardsPerDeck={useGameStore.getState().settings?.maxCardsPerDeck ?? MAX_CARDS_PER_DECK}
```

### Phase 4: Create Tests
**File**: `tests/components/onboarding/DeckDistributionList.test.tsx` (new)

Test cases:
- Renders correct deck names and counts
- Shows limit indicator
- Bars have correct width percentages
- Shows hidden count when >10 decks
- Toggle expands to show all decks
- Progressbar role with aria attributes
- Color palette applied correctly

## Files Modified
1. `src/components/onboarding/DeckDistributionList.tsx` (new)
2. `src/components/onboarding/ImportValidationModal.tsx` (enhance)
3. `src/components/onboarding/DeckStoreOnboarding.tsx` (pass settings)
4. `tests/components/onboarding/DeckDistributionList.test.tsx` (new)

## Files to Reference (no changes)
- `src/utils/splitAssociations.ts` - existing split logic
- `src/constants/limits.ts` - `MAX_CARDS_PER_DECK = 100`
- `src/types/settings.ts` - `maxCardsPerDeck` setting
- `src/store/gameStore.ts` - settings state

## Acceptance Criteria
- [x] Deck distribution section appears when total > maxCardsPerDeck
- [x] Deck names follow naming convention (base name + suffix)
- [x] Progress bars show correct fill percentage
- [x] Main button shows deck count and breakdown
- [x] Component is responsive and accessible
- [x] Tests pass (22 onboarding tests)
- [x] TypeScript compiles without errors in modified files
- [x] Scroll vertical when >5 decks
- [x] Toggle "Ver todos" when >10 decks
- [x] Fallback to MAX_CARDS_PER_DECK when settings missing