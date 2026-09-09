# Auto-Split Deck Feature

## Overview

When uploading cards (text, CSV, or YouTube), if the number of cards exceeds the maximum deck size configured by the user, the system automatically splits them into multiple decks with proper naming conventions.

## Configuration

Users can set the maximum cards per deck in **Settings → Máximo de tarjetas por mazo** with 4 options:
- **100** tarjetas por mazo
- **300** tarjetas por mazo
- **700** tarjetas por mazo
- **1000** tarjetas por mazo

### Default Value
- Default: **100** tarjetas por mazo (if not configured)
- Defined in: `src/constants/limits.ts:MAX_CARDS_PER_DECK`

### Where to Find It
- Navigate to **Settings** in the app
- Look for the section **"Máximo de tarjetas por mazo"**
- Select one of the 4 radio button options

## How It Works

### Auto-Splitting Behavior

| Upload Size | Max=100 | Max=300 | Max=700 | Max=1000 |
|-------------|---------|---------|---------|----------|
| 50 cards | 1 mazo | 1 mazo | 1 mazo | 1 mazo |
| 150 cards | 2 mazos | 1 mazo | 1 mazo | 1 mazo |
| 250 cards | 3 mazos | 1 mazo | 1 mazo | 1 mazo |
| 350 cards | 4 mazos | 2 mazos | 1 mazo | 1 mazo |
| 500 cards | 5 mazos | 2 mazos | 1 mazo | 1 mazo |

### Naming Convention
- Original deck keeps its name: `"Latin Root"`
- Subsequent decks get suffix: `"Latin Root - 1"`, `"Latin Root - 2"`, etc.

### Where the Feature Applies
- ✅ Text/CSV imports (via `useDeckImporter` hook)
- ✅ YouTube imports (via `VocabularyPreview` component)
- ❌ Manual list creation (no splitting)

## Technical Implementation

### Files Modified

1. **`src/constants/limits.ts`**: `MAX_CARDS_PER_DECK = 150` (default)

2. **`src/types/settings.ts`**: Added `maxCardsPerDeck: number` to `UserSettings`

3. **`src/components/views/SettingsView.tsx`**: Added settings section with 4 radio options

4. **`src/hooks/dashboard/useDeckImporter.ts`**: Auto-splits on import using user config

5. **`src/App.tsx`**: YouTube import auto-splits using user config

6. **`src/utils/splitAssociations.ts`** (new): `splitAssociationsByMax()` function

### How It Persists
- User setting saved to Firebase settings (cloud + localStorage)
- Falls back to `MAX_CARDS_PER_DECK = 100` if not configured
- Applied automatically on all future imports

### Current Status (2026-09-09)
- `MAX_CARDS_PER_DECK` restored in `src/constants/limits.ts`
- `src/utils/splitAssociations.ts` compiles and uses it as default
- `UserSettings.maxCardsPerDeck` is documented but not yet implemented in UI or backend
- `src/hooks/dashboard/useAssociationManipulation.ts` imports the constant but does not use it; hook is currently unused

## Example Use Cases

### Scenario 1: Teacher imports vocabulary list
- Teacher has 250 new vocabulary words
- Configures max to **300**
- Result: 1 deck created with all 250 cards

### Scenario 2: Student imports YouTube transcript
- Student watches a 20-minute video
- Configures max to **100**
- Result: 2 decks created automatically:
  - Deck 1: first 100 cards
  - Deck 2: remaining 100 cards (named "Video Title - 1")

### Scenario 3: Power user with large imports
- User regularly imports 800+ cards
- Configures max to **1000**
- Result: 1 deck with all cards, no splitting needed

## Related Features
- Deck creation from text/CSV/YouTube
- User settings persistence
- Auto-progression system
- Quota management (free: 1000, premium: 5000 tarjetas total)
