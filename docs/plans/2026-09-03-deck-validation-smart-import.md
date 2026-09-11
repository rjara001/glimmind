# Plan: Deck Validation & Smart Import — Add Deck to My Space with Deduplication

**Date:** 2026-09-03
**Status:** Draft — Revisado con 7 correcciones críticas
**Priority:** High

---
## Objective

Improve the "Add Deck to My Space" interaction by inserting a **deduplication and validation step** before any deck is committed. When a user triggers "Add to My Space" from the Deck Store, instead of immediately creating a full copy of all the deck's cards, the system will:

1. **Analyze the deck's cards against the user's existing cards** (across all their lists).
2. **Categorize each card as Existing** (exact term match already in space), **Similar** (Levenshtein-similarity duplicate), or **New** (completely new).
3. **Present a validation screen** (matching the reference HTML design) with:
   - An analysis summary (5 stat tiles: Total, Existing, Similar, New, Decks).
   - A human-readable description.
   - **3 checkboxes (Existing, Similar, New)** that toggle which categories to include.
   - **One "Add selected cards" button** that is enabled only when at least one category is selected and adds only cards from the checked categories.
4. **On confirm, only the selected cards are added** to the user's space, respecting quota rules.

This prevents accidental duplicates and gives users control over what enters their space.

---
## Design Decisions (Resolving the 7 Critical Issues)

### 1. Flow: 1 botón con checkboxes (Opción B — decisión final)
**Decision:** Usar **1 solo botón "Agregar tarjetas"** que respete el estado de los checkboxes, **NO 3 botones** con acciones distintas.

- **Rationale:** El Objective original mencionaba 3 botones, lo cual contradice la decisión tomada en la sección 6 (consistencia entre 3a y 4a). Un solo botón es más simple, consistente con el HTML de referencia acordado, y elimina la contradicción. El botón dice "Agregar tarjetas" y está **deshabilitado cuando ninguna categoría está checkeada** (`selectedCount === 0`).
- **Behavior:** El usuario ve 3 checkboxes (Existing, Similar, New), todas checkeadas por defecto. Al hacer clic en "Agregar tarjetas", se importan solo las cartas de las categorías checkeadas. Si el usuario descheckea todo, el botón se deshabilita y no pasa nada.

### 2. useDeckValidation: flujo exacto definido
**Decision:** El hook se llama **en el render de DeckStoreOnboarding** después de que el usuario hace clic en "Agregar" del modal y este cierra.

- **Flujo exacto y transacción atómica:**
  1. Usuario hace clic en "Agregar a mi Espacio" en DeckPreviewModal.
  2. **En la misma transacción de handler:** (a) se setea `selectedDeck = deck` en estado, y (b) el modal cierra (onClose).
  3. DeckStoreOnboarding renderiza con el nuevo `selectedDeck` en estado.
  4. Se ejecuta: `const result = useDeckValidation(selectedDeck, lists)`.
  5. Si `result === null`, se muestra `"Analizando..."` y el botón está **disabled**.
  6. Cuando `result` tiene datos, se abre `DeckValidationScreen` a pantalla completa.
- **Rationale:** Evita que el hook sea una "caja negra". La transacción atómica garantiza que `selectedDeck` ya esté en estado cuando el hook se ejecuta. El hook se memoiza por `selectedDeck.id + listChecksum`, y solo se recompute cuando el usuario vuelve al store y vuelve a hacer clic en "Agregar".

### 3. Modal y validación: se cierra el modal y aparece pantalla completa
**Decision:** Al hacer clic en "Agregar" del modal, **se cierra el modal y se abre DeckValidationScreen a pantalla completa**. El botón "Volver" de la validación reabre el modal con el mismo deck.

- **Flujo:** (a) Usuario hace clic en "Agregar" → (b) modal cierra instantáneamente con onClose() → (c) DeckStoreOnboarding setea `selectedDeck` y renderiza → (d) hook `useDeckValidation(selectedDeck, lists)` se ejecuta en ese render → (e) mientras el hook computa (~3ms para 65 cartas), se muestra `"Analizando..."` y el botón está **disabled** en DeckStoreOnboarding (sobre la lista de decks) → (f) cuando el result está listo, DeckValidationScreen se abre a pantalla completa con los resultados.
- **Volver:** El botón "Volver" en la validación devuelve al usuario al DeckStore (lista de decks), no al modal. Si quiere reintentar con el mismo deck, debe volver al store y hacer clic en "Agregar" nuevamente.
- **Rationale:** Arquitectura clara: el modal y la validación no conviven superpuestos. El usuario ve el mensaje "Analizando..." sobre el store, entiende que es temporal y que los resultados pronto aparecerán.

### 4. Umbral de similitud: **0.80** (volver al valor original)
**Decision:** `SIMILARITY_THRESHOLD = 0.80`.

- **Rationale:** La decisión de 0.75 generaría falsos positivos. Ejemplos con 0.75:
  - "Access"/"Acceso" (0.72) caerían como "similar" — son palabras distintas en idiomas diferentes, **no deberían** ser similares.
  - "Abandon"/"Abandonar" (0.78) pasarían a "similar", pero es aceptable como caso documentado.
- **Consistencia con HTML de referencia:** El HTML de referencia muestra "Abandon" ↔ "Abandonar" como ejemplo de "Similar" (0.78). Para alinear el algoritmo con el HTML, se documenta lo siguiente:
  - Si se quiere mantener el HTML tal cual: usar umbral 0.75 (aceptará "Abandon"/"Abandonar" como Similar, pero generará algunos falsos positivos como "Access"/"Acceso").
  - Si se prefiere el umbral 0.80 (menos falsos positivos): actualizar el ejemplo en el HTML para que sea "Abandon" ↔ "Abandoned" (0.85), que sí cae como Similar con 0.80.
- **Decisión tomada:** Mantener `0.80` y **actualizar el HTML de referencia** para que el ejemplo de "Similar" sea "Abandon" ↔ "Abandoned" (0.85), consistente con el umbral elegido. El par "Abandon" ↔ "Abandonar" (0.78) será categorizado como **"New"**, lo cual es acceptable porque:
  - No es el caso crítico del HTML (ejemplo documentado, no comportamiento esperado).
  - Evita clasificación errónea de pares de palabras reales en idiomas distintos.
  - Mantiene la consistencia con el umbral de similitud del motor del juego.

### 5. Cambio de deck: siempre se vuelve al store explícitamente
**Decision:** No hay cambio de deck "en caliente". Si el usuario quiere cambiar de deck:

- Debe hacer clic en "Volver" desde la validación, que lo devuelve al DeckStore.
- Al volver, `selectedDeck` se setea a `null` y se resetean todos los estados.
- Para elegir otro deck, debe volver al store y hacer clic en "Agregar" en el nuevo deck.
- **Rationale:** La decisión #8 no especifica cómo se detecta el cambio, y intentar detectar cambios mientras el usuario está en la validación crea estado indefinido. El flujo seguro es: siempre volver al store primero.

### 6. SIMILARITY_SAMPLE_LIMIT: **quitar por ahora**
**Decision:** Remover la constante `SIMILARITY_SAMPLE_LIMIT` y el early-exit optimization basados en ella.

- **Rationale:** La decisión #7 (hook memoizado por deck.id + listChecksum) entra en conflicto con el sample limit. Si el usuario tiene 10,000 términos y solo se comparan contra 1,000, el resultado depende de **qué** 1,000 términos se elijan (los "más recientes" vs "más antiguos"), lo que rompe la estabilidad de la memoización.
- **Performance:** Con 65 cartas y ~1000 términos en lists, son ~65,000 comparaciones a ~0.02ms cada una = **~1.3 segundos**. Es aceptable para una operación única al agregar un deck. Si en el futuro es necesario, se puede añadir con un criterio determinista (ej. "los 1000 términos alfabéticamente primeros").

### 7. Caso new === 0: deshabilitar botón, no toast
**Decision:** El botón "Agregar tarjetas" está **deshabilitado** cuando `selectedCount === 0`, que incluye el caso de "solo new está checkeado y nuevas === 0".

- **Rationale:** La decisión #12 mostraba un toast "No hay tarjetas nuevas" y el botón seguía habilitado, lo cual es mala UX: el usuario hace clic en un botón que parece funcional y no pasa nada (o aparece un toast confuso).
- **Behavioro correcto:**
  - Si `selectedCount > 0` (al menos una categoría checkeada): botón habilitado, al hacer clic importan las cartas de esas categorías, **y se muestra un resumen** tipo: `"Se agregarán X tarjetas (Y existentes + Z similares + W nuevas)"`.
  - Si `selectedCount === 0` (ninguna categoría checkeada, o solo new checkeado pero nuevas === 0): botón deshabilitado, el usuario entiende que no hay nada que añadir.
  - **Contador visible:** El UI incluye un contador que muestra la cantidad de tarjetas que se agregarán, desglosado por categoría: `"X tarjetas seleccionadas (A existentes + B similares + C nuevas)"`. Esto ayuda al usuario a entender qué está pasando antes de hacer clic.
- **No se muestra toast** a menos que el usuario intente guardar algo inválido en otro contexto.

---
## Files to Add

| File | Purpose |
|---|---|
| `src/types/deck-validation.ts` | Types: `CardCategory`, `CategorizedCard`, `DeckValidationResult` |
| `src/constants/deckValidation.ts` | Threshold: `SIMILARITY_THRESHOLD = 0.80` |
| `src/utils/deckValidation.ts` | Pure analysis logic (categorize cards) |
| `src/hooks/dashboard/useDeckValidation.ts` | Memoized hook wrapper |
| `src/components/onboarding/DeckValidationScreen.tsx` | Main validation UI component (1 botón + 3 checkboxes) |
| `src/components/onboarding/DeckAnalysisStats.tsx` | Stats grid subcomponent (5 tiles) |
| `src/components/onboarding/DeckCategorySelector.tsx` | Checkbox selector subcomponent (con aria-*) |
| `tests/utils/deckValidation.test.ts` | Unit tests for analysis logic |
| `tests/components/onboarding/DeckValidationScreen.test.tsx` | Component tests |
| `docs/plans/2026-09-03-deck-validation-smart-import.md` | This plan (corregido) |

---
## Files to Modify

| File | Change |
|---|---|
| `src/components/onboarding/DeckStoreOnboarding.tsx` | Add validation state (`selectedDeck`), analysis via `useDeckValidation` en render, render `DeckValidationScreen`, filter deck on confirm. Remover `isAdding`. |
| `src/components/onboarding/DeckCard.tsx` | Cambiar "Add" button a `onValidate` (abre validación), remover `isAdding`. |
| `src/components/onboarding/DeckPreviewModal.tsx` | Cambiar "Agregar" button a `onValidate`, cerrar modal y setear `selectedDeck` al confirmar. |
| `src/utils/similarity.ts` | Export `normalize` (ya existía, solo añadir export). |
| `src/constants/version.ts` | Bump a `1.25.0` (minor bump por correcciones de UI/UX). |
| `package.json` | Bump a `1.25.0`. |

---
## Validation & Acceptance

1. **Type-check:** `npx tsc --noEmit` passes.
2. **Unit tests:** `npx vitest run tests/utils/deckValidation.test.ts` — all cases pass, incluyendo:
   - Umbral 0.80 (no 0.75)
   - existingLists === [] → all "new"
   - new === 0 → botón deshabilitado (no toast)
   - Sample limit removido
3. **Component tests:** `npx vitest run tests/components/onboarding/DeckValidationScreen.test.tsx` — renders pass, incluyendo:
   - **1 solo botón** "Agregar tarjetas" (no 3 botones)
   - 3 checkboxes (Existing, Similar, New)
   - Botón deshabilitado cuando `selectedCount === 0`
   - Toggling categories actualiza preview
   - "Back" returns to deck store
   - Accessibility (aria-*) en todos los elementos
   - Loading state durante el análisis (en render, no en hook)
   - Similar expander muestra pares
   - "All new" message cuando corresponde
4. **Manual flow:**
   - Open Deck Store → click "Agregar a mi Espacio" en un deck.
   - Modal cierra, validación se abre a pantalla completa.
   - Ve 5 tiles de análisis + 3 checkboxes.
   - Toggling checkboxes actualiza conteo preview.
   - Si ninguna categoría tiene check (o solo new con 0): botón "Agregar tarjetas" está **deshabilitado**.
   - Si alguna categoría tiene check: botón habilitado, al hacer clic importan solo esas cartas.
   - "Back" returns to deck store.
   - Quota respected.
   - UI adapta a mobile.

---
## Decision Rationale Summary

| Issue | Decision | Rationale |
|---|---|---|
| 3 buttons vs 1 button | **1 botón** con checkboxes | El Objective original lo contradictó; 1 botón es más simple y consistente con HTML acordado |
| Umbral 0.75 vs 0.80 | **0.80** | 0.75 genera falsos positivos (ej. "Access"/"Acceso" a 0.72). 0.80 + documentación del caso "Abandon"/"Abandonar" es más seguro |
| 4 vs 5 stat tiles | **5 tiles** | Incluye DeckDistributionList (aprobado otro plan) |
| isAdding prop | **Removido** | Flujo confuso, DeckStoreOnboarding maneja todo el ciclo |
| Modal vs validación | **Modal cierra, validación fullscreen** | Arquitectura clara, sin ambigüedades de superposición |
| Sample limit | **Quitado** | Rompe estabilidad de memoización por listChecksum. Performance aceptable sin él. |
| new === 0 UX | **Botón disabled** | Evita que usuario haga clic en botón que parece funcional pero no hace nada |

---
## Non-Goals

- No server-side deduplication (client-side only).
- No definition-level similarity (term-level only).
- No persistent "don't show again" or "always add new only" preference.
- No batch import of multiple decks with combined analysis.
- Same ListEditor import flow (separate from this Deck Store flow).