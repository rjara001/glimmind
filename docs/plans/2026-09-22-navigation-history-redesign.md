# Plan: Rediseño del Sistema de Navegación (Historial de Navegación)

**Fecha:** 2026-09-22  
**Autor:** Rodrigo Jara  
**Estado:** En diseño (no implementar hasta confirmación)

---

## Contexto y Problema Actual

El botón "Atrás" (`goBack`) tiene comportamiento anómalo:
- Accede a tarjetas que ya cambiaron de ciclo
- Dispara side effects (auto-reveal, auto-advance) al navegar
- No restaura estado visual coherente

---

## Solución: Historial de Navegación (Back/Forward Stack)

### Concepto
Una lista en memoria que almacena **referencias** a tarjetas ya jugadas, permitiendo navegación bidireccional estilo browser.

---

## Estructura de Datos

### `HistoryEntry` (en `GlimmindGame` / `GameState`)

```typescript
interface HistoryEntry {
  associationId: string;    // Referencia al mazo (NO snapshot de valores)
  indexInQueue: number;     // Posición en activeQueue al momento (para debug/orden)
}
```

**Regla clave:** NO guardar `value1`/`value2`/`displayTerm`/`displayDef`. Se leen directo del mazo via `associationId`. Esto permite:
- Edición en historial (cambios se reflejan al mazo)
- Menos memoria
- Consistencia garantizada

### Estado de Navegación (en `GameState`)

```typescript
interface GameState {
  // ... campos existentes
  navigationHistory: HistoryEntry[];  // Stack de tarjetas jugadas
  historyIndex: number;               // -1 = "en vivo" (al final), 0..N-1 = en historial
}
```

- `historyIndex === -1` → Usuario está en la tarjeta "actual" (al final del historial)
- `historyIndex >= 0` → Usuario navega en el historial (visualización)
- `historyIndex === 0` → Primera tarjeta jugada (no se puede ir más atrás)

---

## Flujo de Navegación

```
┌─────────────────────────────────────────────────────────────────┐
│                     HISTORIAL DE NAVEGACIÓN                      │
│  [Entry0] → [Entry1] → [Entry2] → [Entry3] → (en vivo)          │
│       ↑          ↑          ↑          ↑                          │
│     index=0    index=1    index=2    index=3    historyIndex=-1 │
└─────────────────────────────────────────────────────────────────┘
```

### Acciones

| Acción | Condición | Comportamiento |
|--------|-----------|----------------|
| **Siguiente** | `historyIndex === -1` (en vivo) | 1. Tomar siguiente aleatoria de `activeQueue`<br>2. Push `{associationId, indexInQueue}` a `navigationHistory`<br>3. `historyIndex = -1` (se mantiene al final) |
| **Siguiente** | `historyIndex < navigationHistory.length - 1` (en historial) | 1. `historyIndex++`<br>2. Mostrar tarjeta via `navigationHistory[historyIndex].associationId` (revelada) |
| **Atrás** | `historyIndex > 0` | 1. `historyIndex--`<br>2. Mostrar tarjeta via `navigationHistory[historyIndex].associationId` (revelada) |
| **Atrás** | `historyIndex === 0` | No-op (ya en la primera) |
| **Cambio de ciclo** (`_checkForNextCycle`) | Siempre | 1. `navigationHistory = []`<br>2. `historyIndex = -1` |

### Detalles de Comportamiento

- **En historial (`historyIndex !== -1`):**
  - Tarjeta siempre **revelada** (`revealed = true`)
  - Input **disabled** (no editable en navegación, pero editable si usuario abre modal de edición)
  - Botón "Validar" **disabled**
  - Botón "Revelar" **oculto** (ya revelada)
  - Botón "Siguiente" habilitado (navega en historial o genera nueva si al final)
  - Botón "Atrás" habilitado si `historyIndex > 0`

- **Edición en historial:** Permitida. Usuario navega atrás → click "Editar" → modal edita el objeto en el mazo → al volver "siguiente" o salir del historial, ve cambios reflejados.

- **Auto-reveal / Auto-advance:** No aplican en historial. Timers se pausan/detienen al navegar.

- **Persistencia:** Solo memoria volátil. NO se guarda en `resumeState` / Firestore.

---

## Archivos a Modificar

| Archivo | Cambios Principales |
|---------|---------------------|
| **`src/services/gameEngine.ts`** | Core: `navigationHistory`, `historyIndex` en `GameState`; métodos `goBack()`, `goForward()`, `_checkForNextCycle()`, `get currentCard()`; limpiar historial en ciclo nuevo |
| **`src/hooks/game/useGameLogic.ts`** | Remover `isNavigatingRef`, auto-reveal/advance effects; `currentAssociation` usa `game.currentCard`; exponer `actions.goBack`/`goForward` |
| **`src/types/game-view.ts`** | Añadir `onGoForward` a `CardStageProps` (ya hecho en iteración anterior) |
| **`src/components/views/GameView.tsx`** | Pasar `actions.goBack`/`goForward` a `CardStage`; remover lógica auto-advance/reveal |
| **`src/components/views/game/CardStage.tsx`** | `onNext = historyIndex === -1 ? actions.handlePass : actions.goForward`; `revealed = historyIndex !== -1 || gameState.revealed`; `currentCycle` desde `currentAssociation?.currentCycle` |
| **`src/components/game/GameControls.tsx`** | Props: `historyIndex`; en historial: input disabled, validar disabled, revelar oculto |
| **`src/components/game/GameCard.tsx` / `CardContent.tsx`** | Input `disabled={historyIndex !== -1}`; badges/estados según historial |

---

## Tests a Implementar

### Nuevos tests en `tests/services/gameEngine.test.ts`

1. **`goBack`/`goForward` navegan historial y muestran valores del mazo**
   - Jugar 3 tarjetas → history = [A,B,C], index = -1
   - `goBack()` → index=1 (muestra B), `goBack()` → index=0 (muestra A)
   - `goForward()` → index=1 (muestra B), `goForward()` → index=2 (muestra C), `goForward()` → index=-1 (nueva aleatoria D)

2. **`goForward` al final del historial genera aleatoria y agrega a historial**
   - Estar en historial (index=1), `goForward()` hasta final → siguiente aleatoria, history push, index=-1

3. **Cambio de ciclo limpia historial**
   - Completar ciclo 1 → `_checkForNextCycle` → history=[], index=-1

4. **Edición en historial persiste al mazo**
   - Navegar atrás → editar tarjeta → `updateCurrentAssociation` → siguiente muestra cambios

### Tests en `tests/components/game/GameControls.test.tsx`

5. **En historial: input disabled, validar disabled, revelar oculto**
   - Render con `historyIndex=0` → validar disabled, revelar no visible

### Tests en `tests/hooks/game/useGameLogic.test.ts`

6. **No auto-reveal/auto-advance al navegar historial**
   - Navegar atrás a tarjeta con attempts previos → no dispara auto-advance

---

## Criterios de Aceptación

- [ ] Usuario puede ir "atrás" y ver tarjetas previas reveladas
- [ ] Usuario puede ir "siguiente" en historial y volver al final
- [ ] Al final del historial, "siguiente" genera tarjeta aleatoria nueva
- [ ] Cambio de ciclo limpia historial completamente
- [ ] En historial: input disabled, validar disabled, revelar oculto
- [ ] Edición en historial modifica el mazo y se ve al navegar
- [ ] No auto-reveal/auto-advance al navegar con botones
- [ ] Historial NO se persiste (volátil)
- [ ] Todos los tests existentes pasan + nuevos tests

---

## Preguntas Abiertas / Decisiones Pendientes

1. **`currentCycle` en UI**: ¿Muestra `currentAssociation.currentCycle` (ciclo real de la tarjeta) o `globalCycle` (ciclo actual del juego)?
   - *Propuesta:* `currentAssociation.currentCycle` para mostrar progreso real de esa tarjeta

2. **`revealedAssociations` vs `navigationHistory`**: ¿Conviven o `navigationHistory` reemplaza?
   - *Propuesta:* Conviven. `revealedAssociations` = historial de revelaciones para actividad/analytics. `navigationHistory` = navegación visual.

3. **`indexInQueue` en `HistoryEntry`**: ¿Necesario?
   - *Propuesta:* Sí, para debug y posible re-ordenación si `activeQueue` cambia (shuffle en nuevo ciclo)

---

## Orden de Implementación Sugerido

1. `src/services/gameEngine.ts` - Core del historial
2. `src/hooks/game/useGameLogic.ts` - Hook expone acciones, usa `currentCard`
3. `src/components/views/GameView.tsx` - Wiring de props
4. `src/components/views/game/CardStage.tsx` - Lógica condicional onNext/revealed
5. `src/components/game/GameControls.tsx` - UI condicional por `historyIndex`
6. `src/components/game/GameCard.tsx` / `CardContent.tsx` - Input disabled en historial
7. Tests (mínimo 6 nuevos)
8. Verificación manual + regresión

---

**Próximo paso:** Confirmar plan → Implementar en orden