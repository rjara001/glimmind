# Mobile UX Improvements

## Overview

Complete mobile UX overhaul with 6 major improvements:

1. **Header Accessibility**: Replaced unintuitive drag-down-to-reveal with a simple tap toggle
2. **STT Concatenation Fix**: Fixed voice responses being concatenated with previous answers
3. **Auto-reveal & Auto-advance**: Configurable timers to reduce manual interaction
4. **Voice Controls**: Audio-style controls (Stop/Play/Pause/Replace) for voice mode
5. **Voice Mode Default**: Voice mode no longer activates by default
6. **Inline Name Editing**: Double-click list name to edit inline

---

## 1. Header Mobile Accessibility

### Problem
The drag-down-to-reveal pattern for the game header was unintuitive. Users couldn't discover how to access header controls.

### Solution
Replaced the drag gesture with a simple tap toggle button. Removed redundant back arrow from mini-header.

### Files Modified

#### `src/hooks/ui/useImmersiveHeader.ts`
- Removed `isDragging`, `dragY`, `startY`, `currentY` state/refs
- Removed `handleTouchStart`, `handleTouchMove`, `handleTouchEnd` handlers
- Added `toggle()` method for simple tap interaction
- Kept auto-hide behavior (3 seconds)

#### `src/components/views/GameView.tsx`
- Removed touch event handlers
- Added visible toggle button with list name and chevron icon
- Button shows current state (expanded/collapsed) with rotation animation
- Removed redundant back arrow from mini-header

---

## 2. STT Concatenation Fix

### Problem
In voice mode, the browser's Speech-to-Text was concatenating previous responses with the current one.

### Root Cause
`useBrowserSTT.ts` was iterating from index 0, re-processing old results.

### Solution
Use `event.resultIndex` to only process new results:

#### `src/hooks/voice/stt/useBrowserSTT.ts`
```ts
// Before
for (let i = 0; i < event.results.length; i += 1) {

// After
for (let i = event.resultIndex; i < event.results.length; i += 1) {
```

---

## 3. Auto-reveal & Auto-advance

### Problem
Users had to manually reveal answers and advance cards too often.

### Solution
Added two configurable settings with sensible defaults.

### Files Modified

#### `src/types.ts`
```ts
settings: {
  autoRevealAfterSeconds?: number;  // default: 15
  autoAdvanceAfterAttempts?: number; // default: 3
}
```

#### `src/hooks/app/useAppActions.ts`
```ts
const DEFAULT_LIST_SETTINGS = {
  autoRevealAfterSeconds: 15,
  autoAdvanceAfterAttempts: 3,
};
```

#### `src/store/gameStore.ts`
Updated `mergeSettings` for cloud sync with new fields.

#### `src/hooks/game/useGameLogic.ts`
Added timer logic with proper cleanup:
- Auto-reveal: Shows answer after N seconds of incorrect attempts
- Auto-advance: Moves to next card after N incorrect attempts
- Timers clear on: card change, manual pass, correct answer, restart, unmount

---

## 4. Voice Controls (Audio-style)

### Problem
Text controls (Pass/Validate/Reveal) were not intuitive for voice mode.

### Solution
Created audio-style controls with Stop/Play/Pause/Repeat buttons.

### Files Modified

#### `src/components/game/VoiceControls.tsx` (NEW)
New component with:
- **Stop** (rose): Turns off voice mode completely
- **Play/Pause** (indigo): Toggle voice mode on/off
- **Repeat** (white): Replays the current word
- Phase indicator showing current state

#### `src/components/views/GameView.tsx`
- Added `isVoiceMode` state to track voice UI visibility
- Added `handleStopVoice` to fully disable voice mode
- Added `handleToggleListening` for play/pause toggle
- Render `VoiceControls` when in voice mode, `GameControls` otherwise

### Behavior
| Action | `isVoiceActive` | `isVoiceMode` | Component |
|--------|-----------------|---------------|-----------|
| Activate voice | `true` | `true` | VoiceControls |
| Pause | `false` | `true` | VoiceControls (Play visible) |
| Resume | `true` | `true` | VoiceControls |
| Stop (button) | `false` | `false` | GameControls |
| Stop (voice cmd) | `false` | `false` | GameControls |

---

## 5. Voice Mode Default

### Problem
Voice mode was activating by default when starting a game.

### Solution
Voice mode now only activates when explicitly passed via `voiceMode={true}` prop.

#### `src/components/views/GameView.tsx`
```ts
// Before
const [isVoiceActive, setIsVoiceActive] = useState(() => voiceMode || list.settings.voiceEnabled === true);

// After
const [isVoiceActive, setIsVoiceActive] = useState(() => voiceMode === true);
```

---

## 6. Inline Name Editing

### Problem
No way to edit list name from game view.

### Solution
Double-click list name to edit inline.

#### `src/components/views/GameView.tsx`
Added:
- `isEditingName` and `editingName` states
- `nameInputRef` for input focus
- `handleStartEditName()`: Enters edit mode
- `handleSaveName()`: Saves edited name
- `handleCancelEditName()`: Cancels edit

**Interactions:**
- **Single click**: Toggle header (expand/collapse)
- **Double click**: Enter edit mode
- **Enter**: Save name
- **Escape**: Cancel edit
- **✓ button**: Save name
- **✗ button**: Cancel edit

---

## Configuration

### Default Values
```ts
autoRevealAfterSeconds: 15,  // Show answer after 15s
autoAdvanceAfterAttempts: 3, // Advance after 3 wrong attempts
```

### To Disable
```ts
settings: {
  autoRevealAfterSeconds: 0,  // Disable auto-reveal
  autoAdvanceAfterAttempts: 0, // Disable auto-advance
}
```

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/hooks/ui/useImmersiveHeader.ts` | Replaced drag with tap toggle |
| `src/hooks/voice/stt/useBrowserSTT.ts` | Fixed STT concatenation |
| `src/hooks/game/useGameLogic.ts` | Added auto-reveal/advance timers |
| `src/hooks/app/useAppActions.ts` | Added default settings |
| `src/types.ts` | Added new settings fields |
| `src/store/gameStore.ts` | Updated mergeSettings |
| `src/components/game/VoiceControls.tsx` | **NEW** - Audio-style controls |
| `src/components/views/GameView.tsx` | Voice controls, name editing, defaults |

---

## Testing Notes

1. **Header Toggle**: Test tap to expand/collapse on mobile
2. **Voice Controls**: Test Stop/Play/Pause/Repeat functionality
3. **Name Editing**: Test double-click to edit, Enter/Escape to save/cancel
4. **Auto-timers**: Test timers start/cancel correctly
5. **Voice Mode**: Verify voice doesn't activate by default
6. **STT**: Test multiple voice responses for concatenation issues
