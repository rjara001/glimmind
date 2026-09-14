# Plan: Migración a Feature-First Architecture

**Fecha:** 2026-09-11  
**Estado:** Draft  
**Prioridad:** Alta  
**Objetivo:** Reorganizar el código en features autocontenidos, sin romper funcionalidad.

---

## Reglas no negociables

- **NO cambiar lógica de negocio.** Solo mover archivos y actualizar imports.
- **Un paso a la vez.** Después de cada paso, ejecutar `npx tsc --noEmit` y verificar que no hay errores nuevos.
- **Commit después de cada feature migrado.** No acumular cambios.
- **NO tocar `App.tsx` hasta el paso final.**
- **Si algo falla, revertir el paso y avisar.**

---

## Estructura objetivo

```
src/
  app/                          # Configuración global (no migrar ahora)
    App.tsx
    main.tsx

  features/                     # ← TODO el código nuevo va aquí
    deck-validation/
      components/
        DeckAnalysisStats.tsx
        DeckCategorySelector.tsx
        DeckDistributionList.tsx
        DeckValidationScreen.tsx
        ImportValidationModal.tsx
      hooks/
        useDeckValidation.ts
        useImportValidation.ts
      services/
        importValidationService.ts
      types/
        deck-validation.ts
        import-deck.ts
      constants/
        deckValidation.ts
        importValidation.ts
      utils/
        deckValidation.ts
        importPreview.ts
        splitAssociations.ts
      index.ts                  # Public API

    publish-deck/
      components/
        PublishDeckScreen.tsx
      services/
        catalogService.ts
      types/
        catalog.ts
      constants/
        publishDeck.ts
      index.ts

    list-editor/
      components/
        ListEditor.tsx
        ValidationScreen.tsx
        AssociationTable.tsx
        BulkImport.tsx
      hooks/
        useListEditorState.ts
        useListStats.ts
        useQuotaValidation.ts
        useSearchFilter.ts
        useAssociationManipulation.ts
      index.ts

  shared/                       # Código compartido entre features
    components/
      Toast.tsx
      QuotaAlert.tsx
      ErrorBoundary.tsx
    hooks/
      useToast.ts
    services/
      callFunction.ts
      quotaService.ts
    utils/
      similarity.ts
      normalizeAssociation.ts
      csv.ts
      activity.ts
      quota.ts
    types/
      index.ts                  # Association, AssociationList, etc.

  store/                        # Zustand (no migrar ahora)
    gameStore.ts

  services/                     # Servicios legacy (migrar después)
    firestoreService.ts
    translationService.ts
    ...
```

---

## Fases de ejecución

### FASE 1: Preparación (30 min)

**Paso 1.1: Crear la estructura de carpetas**

```bash
mkdir -p src/features/deck-validation/{components,hooks,services,types,constants,utils}
mkdir -p src/features/publish-deck/{components,services,types,constants}
mkdir -p src/features/list-editor/{components,hooks}
mkdir -p src/shared/{components,hooks,services,utils,types}
```

**Paso 1.2: Verificar que no hay errores antes de empezar**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Si hay errores, anotarlos. Son la línea base. Al final, deben ser los mismos o menos.

**Paso 1.3: Commit inicial**

```bash
git add -A
git commit -m "chore: create feature-first folder structure"
```

---

### FASE 2: Migrar deck-validation (2-3 horas)

**Regla:** Mover archivos uno a uno. Después de cada archivo, correr `tsc`.

**Paso 2.1: Mover tipos**

```bash
git mv src/types/deck-validation.ts src/features/deck-validation/types/deck-validation.ts
git mv src/types/import-deck.ts src/features/deck-validation/types/import-deck.ts
```

Actualizar imports en TODOS los archivos que los usan:

```bash
grep -r "from.*types/deck-validation" src/ --include="*.ts" --include="*.tsx" -l
grep -r "from.*types/import-deck" src/ --include="*.ts" --include="*.tsx" -l
```

Para cada archivo encontrado, cambiar:

```
from '../../types/deck-validation' → from '../../features/deck-validation/types/deck-validation'
from '../types/deck-validation' → from '../features/deck-validation/types/deck-validation'
```

Verificar:

```bash
npx tsc --noEmit 2>&1 | grep "deck-validation"
```

Si no hay errores → commit:

```bash
git add -A
git commit -m "refactor(deck-validation): move types to feature folder"
```

**Paso 2.2: Mover constantes**

```bash
git mv src/constants/deckValidation.ts src/features/deck-validation/constants/deckValidation.ts
git mv src/constants/importValidation.ts src/features/deck-validation/constants/importValidation.ts
```

Actualizar imports (mismo procedimiento que 2.1). Verificar + commit.

**Paso 2.3: Mover utils**

```bash
git mv src/utils/deckValidation.ts src/features/deck-validation/utils/deckValidation.ts
git mv src/utils/importPreview.ts src/features/deck-validation/utils/importPreview.ts
git mv src/utils/splitAssociations.ts src/features/deck-validation/utils/splitAssociations.ts
```

Actualizar imports. Verificar + commit.

**Paso 2.4: Mover servicios**

```bash
git mv src/services/importValidationService.ts src/features/deck-validation/services/importValidationService.ts
```

Actualizar imports. Verificar + commit.

**Paso 2.5: Mover hooks**

```bash
git mv src/hooks/dashboard/useDeckValidation.ts src/features/deck-validation/hooks/useDeckValidation.ts
git mv src/hooks/useImportValidation.ts src/features/deck-validation/hooks/useImportValidation.ts
```

Actualizar imports. Verificar + commit.

**Paso 2.6: Mover componentes**

```bash
git mv src/components/onboarding/DeckAnalysisStats.tsx src/features/deck-validation/components/DeckAnalysisStats.tsx
git mv src/components/onboarding/DeckCategorySelector.tsx src/features/deck-validation/components/DeckCategorySelector.tsx
git mv src/components/onboarding/DeckDistributionList.tsx src/features/deck-validation/components/DeckDistributionList.tsx
git mv src/components/onboarding/DeckValidationScreen.tsx src/features/deck-validation/components/DeckValidationScreen.tsx
git mv src/components/onboarding/ImportValidationModal.tsx src/features/deck-validation/components/ImportValidationModal.tsx
```

Actualizar imports. Verificar + commit.

**Paso 2.7: Crear public API**

Crear `src/features/deck-validation/index.ts`:

```ts
// Types
export type { CardCategory, CategorizedCard, DeckValidationResult } from './types/deck-validation';
export type { ImportValidationResult } from './types/import-deck';

// Constants
export { SIMILARITY_THRESHOLD } from './constants/deckValidation';

// Utils
export { categorizeDeckCards } from './utils/deckValidation';
export { splitAssociationsByMax } from './utils/splitAssociations';

// Services
export { validateImportCards } from './services/importValidationService';

// Hooks
export { useDeckValidation } from './hooks/useDeckValidation';

// Components
export { DeckValidationScreen } from './components/DeckValidationScreen';
export { ImportValidationModal } from './components/ImportValidationModal';
```

Verificar + commit:

```bash
git add -A
git commit -m "feat(deck-validation): add public API"
```

---

### FASE 3: Migrar publish-deck (1-2 horas)

Mismo procedimiento que FASE 2.

**Archivos a mover:**

```bash
git mv src/components/deck/PublishDeckScreen.tsx src/features/publish-deck/components/PublishDeckScreen.tsx
git mv src/services/catalogService.ts src/features/publish-deck/services/catalogService.ts
git mv src/types/catalog.ts src/features/publish-deck/types/catalog.ts
git mv src/constants/publishDeck.ts src/features/publish-deck/constants/publishDeck.ts
```

Crear `src/features/publish-deck/index.ts`:

```ts
export type { ModerationResult, DeckCategory } from './types/catalog';
export { PUBLISH_MIN_CARDS, PUBLISH_MAX_CARDS } from './constants/publishDeck';
export { catalogService } from './services/catalogService';
export { PublishDeckScreen } from './components/PublishDeckScreen';
```

Verificar + commit.

---

### FASE 4: Migrar list-editor (3-4 horas)

Este es el más grande. Hacerlo con cuidado.

**Paso 4.1: Mover componentes**

```bash
git mv src/components/ListEditor.tsx src/features/list-editor/components/ListEditor.tsx
git mv src/components/list-editor/ValidationScreen.tsx src/features/list-editor/components/ValidationScreen.tsx
git mv src/components/list-editor/AssociationTable.tsx src/features/list-editor/components/AssociationTable.tsx
git mv src/components/list-editor/BulkImport.tsx src/features/list-editor/components/BulkImport.tsx
```

Actualizar imports. Verificar + commit.

**Paso 4.2: Mover hooks**

```bash
git mv src/hooks/dashboard/useListEditorState.ts src/features/list-editor/hooks/useListEditorState.ts
git mv src/hooks/dashboard/useListStats.ts src/features/list-editor/hooks/useListStats.ts
git mv src/hooks/dashboard/useQuotaValidation.ts src/features/list-editor/hooks/useQuotaValidation.ts
git mv src/hooks/dashboard/useSearchFilter.ts src/features/list-editor/hooks/useSearchFilter.ts
git mv src/hooks/dashboard/useAssociationManipulation.ts src/features/list-editor/hooks/useAssociationManipulation.ts
```

Actualizar imports. Verificar + commit.

**Paso 4.3: Crear public API**

```ts
// src/features/list-editor/index.ts
export { ListEditor } from './components/ListEditor';
export { ValidationScreen } from './components/ValidationScreen';
```

Verificar + commit.

---

### FASE 5: Migrar shared (1-2 horas)

Mover TODO lo que es compartido entre features.

```bash
git mv src/components/layout/Toast.tsx src/shared/components/Toast.tsx
git mv src/components/layout/QuotaAlert.tsx src/shared/components/QuotaAlert.tsx
git mv src/components/layout/ErrorBoundary.tsx src/shared/components/ErrorBoundary.tsx
git mv src/services/callFunction.ts src/shared/services/callFunction.ts
git mv src/services/quotaService.ts src/shared/services/quotaService.ts
git mv src/utils/similarity.ts src/shared/utils/similarity.ts
git mv src/utils/normalizeAssociation.ts src/shared/utils/normalizeAssociation.ts
git mv src/utils/csv.ts src/shared/utils/csv.ts
git mv src/utils/activity.ts src/shared/utils/activity.ts
git mv src/utils/quota.ts src/shared/utils/quota.ts
```

Actualizar imports. Verificar + commit.

---

### FASE 6: Actualizar App.tsx (30 min)

Ahora sí, tocar `App.tsx` para usar las nuevas rutas.

**Antes:**

```tsx
import { ListEditor } from './components/ListEditor';
import { DeckStoreOnboarding } from './components/onboarding/DeckStoreOnboarding';
```

**Después:**

```tsx
import { ListEditor } from './features/list-editor';
import { DeckStoreOnboarding } from './components/onboarding/DeckStoreOnboarding';
```

Verificar + commit.

---

## Verificación final

```bash
# 1. TypeScript
npx tsc --noEmit 2>&1 | head -20

# 2. Build
npx vite build 2>&1 | tail -10

# 3. Tests
npx vitest run 2>&1 | tail -20
```

Los 3 deben pasar.

---

## Reglas para la IA que ejecute esto

- **Un paso a la vez.** No hagas 5 pasos juntos.
- **Después de cada `git mv`, corre `npx tsc --noEmit`.**
- **Si hay errores, arréglalos ANTES de continuar.**
- **Si no puedes arreglarlos, revierte el paso y avisa.**
- **Commit después de cada paso exitoso.**
- **NO cambies lógica. Solo mueve archivos y actualiza imports.**
- **NO toques `App.tsx` hasta la FASE 6.**
- **Si algo se rompe y no sabes arreglarlo, PARA y pide ayuda.**

---

## Tiempo estimado

| Fase | Tiempo |
|------|--------|
| 1. Preparación | 30 min |
| 2. deck-validation | 2-3 h |
| 3. publish-deck | 1-2 h |
| 4. list-editor | 3-4 h |
| 5. shared | 1-2 h |
| 6. App.tsx | 30 min |
| **Total** | **8-13 h** |

Se puede hacer en 2-3 sesiones.

---

## Qué NO hacer

- ❌ No refactorizar lógica dentro de los archivos movidos.
- ❌ No renombrar archivos (excepto si hay colisión).
- ❌ No eliminar archivos duplicados sin verificar.
- ❌ No tocar `gameStore.ts` (por ahora).
- ❌ No tocar `App.tsx` hasta el final.
- ❌ No commitear si `tsc` tiene errores nuevos.

---

## Cómo verificar que un paso está bien

Después de cada paso:

```bash
# 1. ¿Compila?
npx tsc --noEmit 2>&1 | grep "<feature-name>"

# 2. ¿Los imports apuntan bien?
grep -r "from.*<old-path>" src/ --include="*.ts" --include="*.tsx" | head -5

# 3. ¿El feature funciona?
npm run dev
# Probar manualmente el feature en el navegador
```

Si los 3 pasan → commit.

Si alguno falla → revertir:

```bash
git reset --hard HEAD
git clean -fd
```

---

## Resultado final

```
src/
  features/
    deck-validation/    ← Todo lo de validación
    publish-deck/       ← Todo lo de publicación
    list-editor/        ← Todo lo del editor
  shared/               ← Componentes, hooks, utils compartidos
  store/                ← Zustand
  app/                  ← App.tsx, main.tsx
```

Cada feature es autocontenido. Se puede testear, modificar o eliminar sin afectar a los demás.