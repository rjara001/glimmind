# Plan: Organic in-game card editing

## Goal
Allow users to quickly edit the current card's term/definition while playing, without leaving the game view.

## Approach
Add an inline edit mode directly on `GameCard` triggered by a subtle edit icon. This is the most organic UX — the user fixes the card exactly where they see it.

## Design decisions
- **Trigger**: Small pencil icon in the top-right of the card, visible on hover (always visible in practice mode, visible when revealed in exam mode).
- **Edit UX**: Clicking the icon toggles the card into edit mode. Term and definition become editable inputs. Save on Enter/blur, cancel on Escape.
- **State flow**: `GameCard` calls `onEditCard(term, definition)` → `GameView` action → `useGameLogic` → `GlimmindGame.updateCurrentAssociation()` → existing `useEffect` syncs updated associations to parent via `onUpdateAssociations`.
- **No navigation**: Edit happens inline; the game continues on the same card after saving.

## Files to modify

### 1. `types/game-card-props.ts`
Add edit-related props:
- `associationId?: string`
- `onEditCard?: (term: string, definition: string) => void`
- `isEditing?: boolean`
- `onStartEdit?: () => void`
- `onCancelEdit?: () => void`

### 2. `components/game/GameCard.tsx`
- Add a subtle edit icon button (absolute positioned, top-right).
- Add local `isEditing` state (or accept as prop).
- When editing, render inputs for term and definition instead of static text.
- On save: call `onEditCard` with trimmed values.
- On cancel: call `onCancelEdit` or reset local state.
- Auto-focus the first input when entering edit mode.

### 3. `services/gameEngine.ts`
Add `updateCurrentAssociation(term: string, definition: string): GlimmindGame`:
- Finds `currentAssociation`.
- Updates `term` and `definition` in both `state.associations` and `initialList.associations`.
- Returns new `GlimmindGame` instance.

### 4. `hooks/useGameLogic.ts`
Add `updateCurrentAssociation` to the `actions` memo:
```typescript
updateCurrentAssociation: (term: string, definition: string) => {
  const after = gameRef.current.updateCurrentAssociation(term, definition);
  setGame(after);
}
```

### 5. `components/GameView.tsx`
- Add `handleEditCard` handler (or pass `actions.updateCurrentAssociation` directly).
- Pass new props to `GameCard`: `associationId`, `onEditCard`, `isEditing`, `onStartEdit`, `onCancelEdit`.

### 6. `components/game/GameCard.test.tsx`
- Update default props to include new optional props (to avoid type errors).
- Add tests for edit mode rendering and save/cancel behavior.

## Validation
- Run existing tests (`npm test` or `vitest`) to ensure no regressions.
- Verify that editing a card during gameplay updates the card in the current round and persists to the list.
- Verify that canceling edit restores original values without side effects.

## Out of scope
- Bulk editing or editing from dashboard (already exists in `ListEditor`).
- Undo/redo for edits.
- Editing archived cards during gameplay.
