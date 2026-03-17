# Glimmind Engine - Audit Report

**Date:** 2026-03-17  
**Status:** PARTIAL IMPLEMENTATION

---

## 1. EXPECTED FUNCTIONALITY (from glimmind-engine.md)

### 1.1 Modo Examen (`real`)

#### Buttons Display (crear test)
| Feature | Expected | Status |
|---------|----------|--------|
| Botón "Pasar" o "Siguiente" | ✅ | ✅ IMPLEMENTED |
| Botón "Validar" | ✅ | ✅ IMPLEMENTED |
| Botón "Revelar" | ✅ | ✅ IMPLEMENTED |

#### Keyboard Shortcuts (crear test)
| Key | Expected Action | Status |
|-----|-----------------|--------|
| `Enter` | Check/validate answer | ❌ NOT IMPLEMENTED |
| `Tab` | Move focus from input to Validate button | ❌ NOT IMPLEMENTED |

#### Validation - Incorrect Attempt (crear test)
| Feature | Expected | Status |
|---------|----------|--------|
| Toast message | Shows user input text | ⚠️ PARTIAL - Shows "Incorrecto" but NOT user input |
| Toast message | Shows similarity percentage | ❌ NOT IMPLEMENTED |
| Toast message | Shows threshold required | ❌ NOT IMPLEMENTED |
| Auto-clear input field | ✅ | ✅ IMPLEMENTED |
| Focus returns to input | ✅ | ✅ IMPLEMENTED |
| Card border turns red | ✅ | ✅ IMPLEMENTED |

#### Validation - Correct Attempt (crear test)
| Feature | Expected | Status |
|---------|----------|--------|
| Ephemeral message | Shows expected text | ⚠️ PARTIAL - Shows toast with definition |
| Ephemeral message | Shows user input | ❌ NOT IMPLEMENTED |
| Ephemeral message | Shows similarity % | ❌ NOT IMPLEMENTED |
| Ephemeral message | Shows threshold | ❌ NOT IMPLEMENTED |
| Auto-clear input field | ✅ | ✅ IMPLEMENTED |
| Focus returns to input | ✅ | ✅ IMPLEMENTED |
| Card border turns green | ✅ | ✅ IMPLEMENTED |

---

### 1.2 Modo Entrenamiento (`training`)

#### Buttons Display (crear test)
| Feature | Expected | Status |
|---------|----------|--------|
| Botón "Pasar" o "Siguiente" | ✅ | ✅ IMPLEMENTED |
| Botón "Revelar" | ✅ | ✅ IMPLEMENTED |
| Botón "Correcta" | ✅ | ✅ IMPLEMENTED |

#### Feedback (crear test)
| Feature | Expected | Status |
|---------|----------|--------|
| No feedback messages | ✅ | ✅ IMPLEMENTED |

---

## 2. ACTUAL IMPLEMENTATION ANALYSIS

### 2.1 Game Engine (`services/gameEngine.ts`)

```
✅ create(list)           - Initialize game
✅ restart()              - Reset game
✅ reveal()               - Show answer
✅ checkAnswer()          - Validate user input
✅ setUserInput(input)    - Update input field
✅ processAction()        - Handle CORRECT/PASS actions
✅ _checkForNextCycle()   - Cycle progression
✅ _calculateSummary()    - End game stats
✅ calculateSimilarity() - Levenshtein distance algorithm

⚠️ ISSUE: threshold is NOT used in checkAnswer() - validation is exact match only
```

### 2.2 State Management

```typescript
// GameState interface (types.ts)
interface GameState {
  listId: string;
  globalCycle: GameCycle;        // 1-4
  associations: Association[];
  activeQueue: string[];        // Card IDs
  currentIndex: number;
  isFinished: boolean;
  summary: GameSummary | null;
  revealed: boolean;
  userInput: string;
  feedback: 'none' | 'correct' | 'incorrect';
  similarity: number | null;    // Calculated but NOT displayed
  lastAttempt: string;          // Stored but NOT displayed in UI
}
```

### 2.3 Current UI Flow

**GameView.tsx:**
- ✅ Shows game card
- ✅ Shows cycle progress sidebar
- ✅ Shows game controls
- ✅ Shows settings modal
- ✅ Shows finished screen
- ✅ Toast integration (partial)
- ❌ NO keyboard event listeners

**GameCard.tsx:**
- ✅ Displays term/definition
- ✅ Input field with focus management
- ✅ Feedback border colors (green/red)
- ⚠️ Shows similarity % only on incorrect (not threshold)
- ⚠️ Shows "Tu respuesta" (Spanish - should be English)

**GameControls.tsx:**
- ✅ "Pasar" button
- ✅ "Validar" / "Revelar" / "Ocultar" buttons
- ✅ "Correcta" button

---

## 3. GAPS & ISSUES

### Critical (Missing Functionality)
1. **No keyboard shortcuts** - Enter, Tab, Space not implemented
2. **Threshold not used** - `settings.threshold` exists but ignored in validation
3. **Incomplete toast messages** - Missing user input, similarity %, threshold

### Medium (UX Issues)
1. **Auto-advance timing inconsistent** - 10s timeout in GameCard.tsx but not in engine
2. **Spanish text残留** - Some Spanish text still in code (see details below)

### Minor (Code Quality)
1. **useGameEngine vs useGameLogic** - Two similar hooks, useGameEngine has auto-advance delay
2. **Console.log statements** - Several debug logs present

---

## 4. SPANISH TEXT REMAINING

| File | Line | Text |
|------|------|------|
| GameCard.tsx | 62 | "similitud del" |
| GameCard.tsx | 73 | "Tu respuesta" |
| GameView.tsx | 92 | "Cargando..." |
| GameView.tsx | 111-112 | "Pendientes", "Correctas" |
| SettingsModal.tsx | 17 | "¿Reiniciar todo el progreso...?" |
| FinishedScreen.tsx | Multiple | "Vistas", "Reconocidas", "Conocidas", "Aprendidas", etc. |
| CycleProgress.tsx | Multiple | "Nueva", "Vista", "Reconocida", "Conocida" |
| Dashboard.tsx | Multiple | "Tus Listas", "Memoriza...", "Nueva Lista", etc. |
| GameControls.tsx | Multiple | "Validar", "Pasar", "Correcta", "Ocultar", "Revelar" |

---

## 5. RECOMMENDATIONS

### Priority 1: Implement Keyboard Shortcuts
Add keyboard event listener in GameView.tsx:
- `Enter` in input → checkAnswer()
- `Tab` from input → focus validate button
- `Space` when revealed → pass/skip
- `Enter/Space` in training mode → reveal or pass

### Priority 2: Fix Toast Messages
Update Toast component to show:
- User input text
- Similarity percentage
- Required threshold

### Priority 3: Use Threshold
Modify `checkAnswer()` in gameEngine.ts to use `threshold` from settings:
```typescript
const similarity = calculateSimilarity(userAnswer, correctAnswer);
const isCorrect = similarity >= (this.initialList.settings.threshold * 100);
```

### Priority 4: Remove All Spanish Text
Translate all remaining Spanish strings to English per AGENTS.md Rule 1.

---

## 6. FILES SUMMARY

| Component | Purpose | Lines | Status |
|-----------|---------|-------|--------|
| gameEngine.ts | Core game logic | 168 | 90% |
| useGameLogic.ts | React hook | 38 | ✅ |
| useGameEngine.ts | React hook (unused) | 66 | ⚠️ |
| GameView.tsx | Main game view | 150 | 70% |
| GameCard.tsx | Card display | 88 | 80% |
| GameControls.tsx | Buttons | 59 | ✅ |
| GameHeader.tsx | Header | 39 | ✅ |
| CycleProgress.tsx | Sidebar | 89 | ✅ |
| SettingsModal.tsx | Settings | 78 | ✅ |
| FinishedScreen.tsx | End screen | 77 | ✅ |
| Toast.tsx | Notifications | 85 | 50% |
