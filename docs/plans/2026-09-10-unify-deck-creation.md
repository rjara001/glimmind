# Plan: Unificación de Flujos de Creación de Mazos

## Objetivo
Un solo proceso para crear y editar mazos, eliminando la duplicación entre `CreateListForm`, `ImportValidationModal` y `ListEditor`. El usuario debe tener un único lugar/flujo para crear nuevas listas.

## Estado Anterior
1. **CreateListForm.tsx** - Dashboard → "Nueva Lista": Tenía Name + Concepto, validación, distribución de decks
2. **ImportValidationModal.tsx** - Usado por ListEditor para importar tarjetas, tenía validación propia de nombre
3. **DeckStoreOnboarding.tsx** - Dashboard → "Catálogo de Barajas": Usaba ImportValidationModal (a reemplazar)
4. **ListEditor.tsx** - Editar lista existente: Usaba ImportValidationModal, nombre "Sin nombre", sin validación mínima

## Cambios Realizados

### 1. ListEditor.tsx - Reemplazar ImportValidationModal por CreateListForm
- **Archivo**: `src/components/ListEditor.tsx`
- **Cambio**: Sustituir el componente `<ImportValidationModal ... />` por `<CreateListForm ... />`
- **Props pasadas**:
  - `newName={editList.name}` - nombre existente de la lista
  - `setNewName={(v) => setEditList((c) => ({ ...c, name: v }))}` - actualizar nombre
  - `newConcept={editList.concept || ''}` - concepto de la lista existente (NUEVO)
  - `setNewConcept={(v) => setEditList((c) => ({ ...c, concept: v }))}` - actualizar concepto (NUEVO)
- **Validación**: Elimina validación duplicada - CreateListForm la maneja (mínimo 2 chars, no vacío)
- **onSubmit**: Simplificado - cierra modal y llama a `cleanupAndSave(editList)`

### 2. DeckStoreOnboarding.tsx - Usar CreateListForm (Hecho anteriormente)
- **Archivo**: `src/components/onboarding/DeckStoreOnboarding.tsx` (línea 7 y 184)
- **Cambio**: Reemplazar `<ImportValidationModal ... />` por `<CreateListForm ... />`
- **Props pasadas**: `newName={validationDeck.name}`, `newConcept={validationDeck.concept || ''}`, `totalCards={validationDeck.associations.length}`

### 3. ImportValidationModal.tsx - Ya no usado en flujos de creación
- El archivo mantiene su funcionalidad propia para casos avanzados
- Ya no es la vía principal para crear mazos nuevos

## Resultado Final

### Un solo componente para creación de mazos:
- **CreateListForm.tsx**: Name + Concepto, validación (mínimo 2 chars, obligatorio), distribución de decks

### Tres flujos unificados:
1. **Dashboard → "Nueva Lista"** → CreateListForm directo
2. **Dashboard → "Catálogo de Barajas"** → elige deck → CreateListForm con nombre prellenado
3. **ListEditor → "Editar nombre/concepto"** → CreateListForm modal con Name + Concepto editables, validación incluida

### Campos consistentes en todos los flujos:
- ✅ **Nombre de la Lista** (obligatorio, mínimo 2 caracteres)
- ✅ **Concepto (Par)** (ej: "Inglés / Español")
- ✅ **Distribución de decks** cuando total > maxCardsPerDeck
- ✅ **Validación consistente** en crear y editar

## Tests
- ✅ 22 tests passing (onboarding + dashboard)
- ✅ TypeScript: Sin errores fatales en archivos modificados

## Files Modificados
1. `src/components/ListEditor.tsx` - Reemplazó ImportValidationModal por CreateListForm
2. `src/components/onboarding/DeckStoreOnboarding.tsx` - Ya usaba CreateListForm (cambio previo)
3. `src/components/views/dashboard/CreateListForm.tsx` - Ya tenía validación unificada
4. `src/components/onboarding/ImportValidationModal.tsx` - Ya no bloquea el flujo de creación

## Versionado
Seguir reglas de bump en `src/constants/version.ts` y `package.json` para este despliegue.