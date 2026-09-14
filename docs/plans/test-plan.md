# Plan: Tests Completos para Glimmind

## Fecha
2026-09-14

## Estado Actual de Tests

### Resumen Ejecución (actualizado 2026-09-14)
```
Test Files  8 failed | 36 passed (44)
Tests       33 failed | 495 passed (528)
```

### Tests Fallando por Archivo (desglose real)

| Archivo | Tests Fallando | Tests Totales | Problema Principal |
|---------|----------------|---------------|-------------------|
| `tests/utils/deckValidation.test.ts` | 12 | 12 | Import path `@/utils/deckValidation` no resuelve; `PrebuiltDeck` no exportado desde `@/types` |
| `tests/components/onboarding/DeckValidationScreen.test.tsx` | 6 | 12 | Selectores de botones no coinciden (texto español vs esperado), checkboxes no accesibles |
| `tests/components/onboarding/DeckDistributionList.test.tsx` | 3 | 10 | Selectores de barras/porcentajes, estilos inline |
| `tests/components/game/SettingsModal.test.tsx` | 5 | 5 | Selectores/accesibilidad, sección Voice Commands |
| `tests/services/grouping/grouping.test.ts` | 2 | 2 | `mockedSemanticGrouping.mockResolvedValue is not a function` (mock setup) |
| `tests/utils/quota.test.ts` | 2 | 2 | Mock/import issues |
| `tests/components/game/CycleProgress.test.tsx` | 1 | N/A | Mobile layout |
| `tests/services/settingsService.test.ts` | 1 | 1 | LocalStorage mock |
| **Total** | **32** | | (el runner reporta 33, diferencia de 1 test) |

### Tests que YA PASAN (Red de Seguridad Actual - 495 tests)
**NO TOCAR ESTOS TESTS.** Si alguno se rompe durante la refactorización, arreglarlo ANTES de continuar.

| Archivo | Tests | Área |
|---------|-------|------|
| `tests/utils/progress.test.ts` | 23 | Progress tracking, streaks, milestones |
| `tests/utils/multivalueParser.test.ts` | 14 | Multivalue parsing, merging, flattening |
| `tests/services/voice/languages.test.ts` | 16 | Language detection, voice resolution |
| `tests/utils/csv.test.ts` | 34 | CSV parsing, headers, delimiters |
| `tests/utils/flattenAssociations.test.ts` | ~10 | Flattening logic |
| `tests/utils/recommendList.test.ts` | ~10 | List recommendations |
| `tests/utils/ranking.test.ts` | ~10 | Ranking calculations |
| `tests/utils/activity.test.ts` | ~10 | Activity tracking |
| `tests/utils/text.test.ts` | ~10 | Text utilities |
| `tests/utils/maskHint.test.ts` | ~5 | Hint masking |
| `tests/services/voice/*` | ~50 | Voice services (earlyMatch, evaluateAnswer, commands, etc) |
| `tests/services/gameEngine.test.ts` | ~100 | Game engine, similarity algorithms |
| `tests/services/verification-engine.test.ts` | ~30 | Verification engine |
| `tests/services/practiceMode.test.ts` | ~15 | Practice mode |
| `tests/store/gameStore.test.ts` | ~15 | Game store |
| `tests/components/game/*` (otros) | ~50 | GameCard, GameHeader, AttemptList, etc |
| `tests/components/onboarding/*` (otros) | ~10 | DeckStoreOnboarding, etc |
| `tests/components/modals/*` | ~20 | Modals |
| `tests/components/layout/*` | ~10 | Layout components |
| `tests/components/*Views*` | ~30 | Views (History, Reports, Settings, Ranking) |
| `tests/hooks/*` | ~10 | Custom hooks |

---

## 1. Comandos de Verificación

### Correr todos los tests
```bash
npx vitest run
```

### Correr tests con output verbose
```bash
npx vitest run --reporter=verbose
```

### Correr un archivo específico
```bash
npx vitest run tests/utils/deckValidation.test.ts
npx vitest run tests/components/onboarding/DeckValidationScreen.test.tsx
```

### Ver output completo de un test que falla
```bash
npx vitest run tests/utils/deckValidation.test.ts --reporter=verbose 2>&1 | head -100
```

### Ver cobertura actual
```bash
npx vitest run --coverage
```

### Correr tests en watch mode (desarrollo)
```bash
npx vitest
```

### Filtrar por nombre de test
```bash
npx vitest run -t "categorizes exact term match"
```

---

## 2. Fase 1: Diagnóstico de Tests Rotos (Tabla de Acción)

| Test | Problema exacto | Fix exacto | Archivo fuente a leer |
|------|-----------------|------------|----------------------|
| `tests/utils/deckValidation.test.ts` (12 tests) | Import `@/utils/deckValidation` no resuelve; tipo `PrebuiltDeck` importado desde `@/types` pero no existe allí | 1. Cambiar import a `import { categorizeDeckCards } from '@/utils/deckValidation'` (verificar path real)<br>2. Importar `PrebuiltDeck` desde `@/types/prebuilt-deck` | `src/utils/deckValidation.ts` |
| `tests/components/onboarding/DeckValidationScreen.test.tsx` (6 tests) | 1. `screen.getByText(/Añadir mazo completo/)` no encuentra botón (texto real: "📤 Agregar tarjetas")<br>2. `screen.getByText(/Añadir solo tarjetas nuevas/)` no existe<br>3. `screen.getByText(/Personalizar selección/)` no existe<br>4. Checkbox selectores usan `getByRole('checkbox')` pero el componente usa `<input type="checkbox">` sin role<br>5. `screen.getByText('Ver ejemplos')` no coincide (botón dice "Ver ejemplos ▼") | 1. Actualizar selectores a textos reales del componente: "📤 Agregar tarjetas", no hay botón "Añadir solo tarjetas nuevas" ni "Personalizar selección" - esos son props callbacks que se testean via `onAddSelected` con categorías seleccionadas<br>2. Usar `getByLabelText` o `getByRole('checkbox', {name: /Existentes/i})` para checkboxes<br>3. Para "Ver ejemplos" usar `getByText(/Ver ejemplos/i)` | `src/components/onboarding/DeckValidationScreen.tsx`<br>`src/components/onboarding/DeckCategorySelector.tsx` |
| `tests/components/onboarding/DeckDistributionList.test.tsx` (3 tests) | 1. `screen.getByText(/Límite:/)` - texto tiene estilos inline, no className `text-indigo-600`<br>2. `container.querySelectorAll('.h-full.rounded-full')` - clases Tailwind no existen en test (estilos inline)<br>3. `expect(bars[0]).toHaveStyle({ backgroundColor: '#6366f1' })` - colores en array `BAR_COLORS` empiezan en `#8b5cf6` | 1. Usar `getByText(/Límite:/i)` y verificar contenido<br>2. Usar `container.querySelectorAll('[role="progressbar"]')` o `querySelectorAll('div[style*="width"]')`<br>3. Verificar colores contra `BAR_COLORS` del componente: `['#8b5cf6', '#6366f1', '#3b82f6', ...]` | `src/components/onboarding/DeckDistributionList.tsx` |
| `tests/components/game/SettingsModal.test.tsx` (5 tests) | 1. Selectores en inglés ("Answer Validation", "Accept & Close") pero componente está en español<br>2. `screen.getByLabelText('Similarity threshold')` - label no coincide<br>3. Sección "Voice Commands" no existe en el componente actual | 1. Traducir selectores al español real del componente<br>2. Usar `getByRole` con nombres accesibles reales<br>3. Eliminar tests de "Voice Commands" si la sección no existe | `src/components/modals/SettingsModal.tsx` |
| `tests/services/grouping/grouping.test.ts` (2 tests) | `mockedSemanticGrouping.mockResolvedValue is not a function` - mock setup incorrecto | 1. Cambiar `vi.mock('./semanticGrouping', ...)` a path absoluto `@/services/grouping/semanticGrouping`<br>2. Usar `vi.hoisted` o `vi.mocked` correctamente: `const mockedSemanticGrouping = vi.mocked(semanticGrouping)` después de `vi.mock` | `src/services/aiService.ts`<br>`src/services/grouping/semanticGrouping.ts` |
| `tests/utils/quota.test.ts` (2 tests) | Mock/import issues - `computeQuotaStatus` no exportado o mock de QuotaService falla | 1. Verificar export de `computeQuotaStatus` en `src/utils/quota.ts`<br>2. Mockear `QuotaService.getStatus` correctamente con `vi.fn()` | `src/utils/quota.ts`<br>`src/services/quotaService.ts` |
| `tests/components/game/CycleProgress.test.tsx` (1 test) | Mobile layout test - `isMobile` prop o breakpoint no se testea correctamente | 1. Verificar props del componente `CycleProgress`<br>2. Mockear `useMediaQuery` o pasar `isMobile` como prop | `src/components/game/CycleProgress.tsx` |
| `tests/services/settingsService.test.ts` (1 test) | LocalStorage mock - `localStorage.setItem` no mockeado en vitest setup | 1. Añadir mock global en `src/vitest.setup.ts`: `global.localStorage = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn(), clear: vi.fn() }`<br>2. O mockear en cada test con `vi.spyOn(Storage.prototype, 'setItem')` | `src/services/settingsService.ts`<br>`src/vitest.setup.ts` |

**Regla:** Antes de escribir el fix, LEER el test roto Y el archivo fuente. No asumir.

**Regla:** Si un test tarda más de lo razonable en arreglarse, borrarlo y reescribirlo desde cero.

---

## 3. Plan de Tests por Módulo

### MÓDULOS CRÍTICOS (se refactorizan en unificación bulk import)

#### `src/hooks/dashboard/useDeckImporter.ts`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `setBulkData actualiza bulkData y parsedData` | Alta | No | - |
| `handleFileChange lee archivo CSV válido y setea fileAssociations` | Alta | No | - |
| `handleFileChange rechaza archivo sin filas válidas` | Alta | No | - |
| `handleFileChange maneja error de lectura` | Alta | No | - |
| `parseBulkData convierte texto a associations normalizadas` | Alta | No | - |
| `resetBulkInputs limpia todo el estado` | Media | No | - |
| `removeUploadedFile limpia archivo seleccionado` | Media | No | - |
| `Modo 'create': onFileSelect callback se dispara con filename` | Alta | No | - |
| `Modo 'import': onBulkAdd callback se dispara con texto` | Alta | No | - |
| `handleFileSelect (nuevo) lee archivo y llama callbacks` | Alta | No | - |

#### `src/components/list-editor/BulkImport.tsx`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Renderiza tabs "Pegar texto" y "Subir archivo"` | Alta | No | - |
| `Tab "paste": textarea acepta input y muestra preview` | Alta | No | - |
| `Tab "paste": botón "Process Import" deshabilitado sin datos` | Alta | No | - |
| `Tab "paste": botón "Process Import" llama onBulkAdd con texto` | Alta | No | useDeckImporter.test.ts |
| `Tab "upload": click en botón abre file input` | Alta | No | - |
| `Tab "upload": selección de archivo muestra nombre y preview` | Alta | No | - |
| `Tab "upload": muestra error si archivo inválido` | Media | No | - |
| `Botón "Limpiar" resetea estado` | Media | No | - |
| `Auto-nombre: al subir archivo, setea nombre si está vacío` | Alta | No | useDeckImporter.test.ts |

#### `src/components/ListEditor.tsx` (solo parte de import)
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Botón "📥 Importar" abre panel bulk` | Alta | No | - |
| `Botón "📥 Importar" valida nombre de mazo antes de abrir` | Alta | No | - |
| `handleBulkAdd valida cuota antes de procesar` | Alta | No | - |
| `handleBulkAdd parsea texto y abre ValidationScreen` | Alta | No | useDeckImporter.test.ts, importValidationService.test.ts |
| `handleBulkAdd rechaza si no hay nombre de mazo` | Alta | No | - |
| `Auto-nombre: al importar archivo, setea editList.name si vacío` | Alta | No | useDeckImporter.test.ts |

#### `src/components/views/dashboard/BulkImportPanel.tsx`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Renderiza correctamente con props del hook` | Alta | No | useDeckImporter.test.ts |
| `Tab "paste": textarea conectada a setBulkData` | Alta | No | useDeckImporter.test.ts |
| `Tab "upload": botón "Elegir archivo" llama onChooseFile` | Alta | No | useDeckImporter.test.ts |
| `Tab "upload": muestra selectedFileName y contador tarjetas` | Alta | No | useDeckImporter.test.ts |
| `Botón "Quitar" llama onRemoveUploadedFile` | Media | No | useDeckImporter.test.ts |
| `Preview muestra badge mapping y tabla` | Alta | No | - |
| `Botón "Limpiar" llama setBulkData("")` | Media | No | useDeckImporter.test.ts |

#### `src/components/views/Dashboard.tsx` (flujo crear lista)
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Click "Nueva Lista" abre CreateListForm` | Alta | No | - |
| `Formulario valida nombre obligatorio` | Alta | No | - |
| `Formulario valida concepto obligatorio` | Media | No | - |
| `Submit crea lista con associations del importer` | Alta | No | BulkImportPanel.test.tsx, useDeckImporter.test.ts |
| `Auto-nombre: al seleccionar archivo, newName = filename sin extensión` | Alta | No | useDeckImporter.test.ts |
| `Cancelar resetea importer y cierra formulario` | Media | No | - |

---

### TESTS DE REGRESIÓN (Bugs arreglados hoy - CRÍTICOS)

| Test | Archivo | Prioridad | Bloqueante | Depende de | Descripción |
|------|---------|-----------|------------|------------|-------------|
| `importSelectedCards crea 3 mazos cuando hay 230 tarjetas` | `tests/components/ListEditor.test.tsx` | Crítica | Sí | BulkImport.test.tsx, useDeckImporter.test.ts, importValidationService.test.ts | Multi-deck split: 100 + 100 + 30 |
| `handleBulkAdd falla si el mazo no tiene nombre` | `tests/components/ListEditor.test.tsx` | Crítica | Sí | - | Validación nombre antes de importar |
| `handleCreateMultipleLists usa el ID real (no temp_)` | `tests/hooks/useAppActions.test.ts` | Crítica | Sí | - | Draft → mazo real con ID real |
| `ValidationScreen → importar selección → actualiza lista existente` | `tests/components/ListEditor.test.tsx` | Crítica | Sí | BulkImport.test.tsx, useDeckImporter.test.ts | Flujo completo editor |

---

### MÓDULOS IMPORTANTES (soportan la lógica)

#### `src/utils/csv.ts` — `parseForPreview`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `parseForPreview detecta header y salta fila` | Alta | No | - |
| `parseForPreview maneja CSV sin header` | Alta | No | - |
| `parseForPreview maneja delimitadores tab, comma, semicolon` | Alta | No | - |
| `parseForPreview maneja comillas y escapes` | Media | No | - |
| `parseForPreview retorna rows limitados a MAX_PREVIEW_ROWS` | Media | No | - |

#### `src/utils/normalizeAssociation.ts` — `normalizeAssociations`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `normalizeAssociations limpia term y definition` | Alta | No | - |
| `normalizeAssociations filtra asociaciones vacías` | Alta | No | - |
| `normalizeAssociations genera IDs únicos para duplicados` | Alta | No | - |
| `normalizeAssociations maneja multivalues (slash-separated)` | Media | No | - |

#### `src/utils/deckValidation.ts` — `categorizeDeckCards`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Categoriza exact match case-insensitive` | Alta | No | - |
| `Categoriza Levenshtein >= 0.80 como similar` | Alta | No | - |
| `Categoriza Levenshtein < 0.80 como new` | Alta | No | - |
| `Maneja accents y casing` | Media | No | - |
| `Maneja punctuation stripping` | Media | No | - |
| `Retorna all new cuando existingLists vacío/null/undefined` | Alta | No | - |
| `Distribución mixta correcta` | Alta | No | - |

#### `src/utils/splitAssociations.ts` — `splitAssociationsByMax`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Single chunk sin sufijo cuando count == max` | Alta | No | - |
| `Single chunk sin sufijo cuando count < max` | Alta | No | - |
| `Primer chunk nombre base, siguientes numerados` | Alta | No | - |
| `Múltiples chunks con naming correcto` | Alta | No | - |
| `Default max y default name cuando omitidos` | Media | No | - |
| `Empty array retorna empty result` | Media | No | - |

#### `src/services/importValidationService.ts` — `validateImportCards`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Categoriza exact match contra listas existentes` | Alta | No | - |
| `Categoriza similar (Levenshtein >= 0.80)` | Alta | No | - |
| `Categoriza new (below threshold)` | Alta | No | - |
| `Normaliza términos antes de comparar` | Alta | No | - |
| `Retorna existingTerms Set para uso posterior` | Media | No | - |
| `Maneja arrays vacíos` | Media | No | - |

---

### TESTS DE INTEGRACIÓN (Solo 2 Flujos Críticos)

#### `tests/integration/import-flow-dashboard.test.tsx`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Flujo: Nueva Lista → pegar CSV → submit → crea lista` | Crítica | Sí | BulkImportPanel.test.tsx, useDeckImporter.test.ts, Dashboard.test.tsx |
| `Flujo: Nueva Lista → subir archivo → auto-nombre → submit` | Crítica | Sí | BulkImportPanel.test.tsx, useDeckImporter.test.ts, Dashboard.test.tsx |

#### `tests/integration/import-flow-editor.test.tsx`
| Test | Prioridad | Bloqueante | Depende de |
|------|-----------|------------|------------|
| `Flujo: Editor → 📥 Importar → pegar CSV → Process Import → ValidationScreen` | Crítica | Sí | BulkImport.test.tsx, useDeckImporter.test.ts, ListEditor.test.tsx |
| `Flujo: Editor → 📥 Importar → subir archivo → auto-nombre → ValidationScreen` | Crítica | Sí | BulkImport.test.tsx, useDeckImporter.test.ts, ListEditor.test.tsx |
| `Validación nombre mazo antes de Process Import` | Alta | No | ListEditor.test.tsx |
| `Validación cuota en handleBulkAdd` | Alta | No | ListEditor.test.tsx |

---

## 4. Orden de Ejecución

### Fase 1: Arreglar Tests Existentes Rotos
1. Ejecutar diagnóstico tabla arriba (8 archivos)
2. Para cada: leer test + leer fuente → aplicar fix exacto
3. Si > tiempo razonable → borrar y reescribir
4. Objetivo: `npx vitest run` → 0 fallando

### Fase 2: Tests de Regresión + Unitarios Críticos
1. Tests de regresión (4 tests - ver tabla)
2. `useDeckImporter.test.ts`
3. `BulkImport.test.tsx`
4. `BulkImportPanel.test.tsx`
5. `ListEditor.test.tsx` (import flow)
6. `Dashboard.test.tsx` (crear lista)

### Fase 3: Tests Unitarios Módulos Importantes
1. `normalizeAssociation.test.ts`
2. `importValidationService.test.ts`
3. Ampliar `csv.test.ts`
4. Verificar `deckValidation.test.ts` (tras Fase 1)
5. Verificar `splitAssociations.test.ts`

### Fase 4: Tests de Integración (2 flujos críticos)
1. `import-flow-dashboard.test.tsx` (2 tests)
2. `import-flow-editor.test.tsx` (4 tests)

### Fase 5: Test de Humo Manual (OBLIGATORIO antes de commit)
1. `npm run dev`
2. `npm run emulators` (en otra terminal)
3. Abrir app en navegador
4. Crear mazo "TEST"
5. Importar 230 tarjetas vía CSV
6. Click "Agregar tarjetas"
7. Verificar en Firestore (http://127.0.0.1:4000/firestore): 3 mazos (TEST 100, TEST-2 100, TEST-3 30)
8. Editar uno de los mazos
9. Jugar una partida
10. Verificar: sin errores en consola
11. Si falla → NO commitear. Arreglar primero.

---

## 5. Criterios de Aceptación por Test

### Nomenclatura
```
describe('NombreModulo', () => {
  it('descripción en español, minúscula, imperativo', () => { ... })
})
```

### Estructura AAA (Arrange, Act, Assert)
```typescript
it('descripción', () => {
  // Arrange
  const input = ...
  const mockFn = vi.fn()
  
  // Act
  const result = functionUnderTest(input)
  
  // Assert
  expect(result).toEqual(expected)
  expect(mockFn).toHaveBeenCalledWith(expectedArgs)
})
```

### Mocks - Qué Mockear
| Mockear (Externo) | NO Mockear (Interno) |
|-------------------|---------------------|
| `localStorage` | `parseForPreview` |
| `fetch` / APIs | `normalizeAssociations` |
| `crypto.randomUUID` (si determinista) | `calculateSimilarity` |
| `window.alert`, `showToast` | Lógica de negocio pura |
| Firestore / Firebase | Componentes hijos (shallow) |

### Cobertura Mínima
- **Líneas**: ≥ 80%
- **Branches**: ≥ 75%
- **Functions**: ≥ 80%
- **Statements**: ≥ 80%

### Archivos de Test - Ubicación
```
tests/
├── utils/
│   ├── csv.test.ts                    # ✅ Existe, ampliar
│   ├── normalizeAssociation.test.ts   # NUEVO
│   ├── deckValidation.test.ts         # ✅ Existe, arreglar (Fase 1)
│   ├── splitAssociations.test.ts      # ✅ Existe, verificar
│   └── importValidationService.test.ts # NUEVO
├── hooks/
│   ├── useDeckImporter.test.ts        # NUEVO
│   └── useAppActions.test.ts          # NUEVO (para handleCreateMultipleLists)
├── components/
│   ├── ListEditor.test.tsx            # NUEVO (solo import + regresión)
│   ├── BulkImport.test.tsx            # NUEVO
│   ├── BulkImportPanel.test.tsx       # NUEVO
│   └── Dashboard.test.tsx             # NUEVO (solo crear lista)
└── integration/
    ├── import-flow-dashboard.test.tsx # NUEVO (2 tests)
    └── import-flow-editor.test.tsx    # NUEVO (4 tests flujo)
```

---

## 6. Cómo Testear `handleCreateMultipleLists`

**Archivo:** `tests/hooks/useAppActions.test.ts` (NUEVO)

**Cómo testearlo:**
1. Usar `renderHook` de `@testing-library/react`
2. Mockear `listService.splitList` con `vi.fn()` que devuelve `{ ids: ['id-1', 'id-2'] }`
3. Mockear `useGameStore` con estado inicial:
   - `user: { uid: 'test-user' }`
   - `lists: [{ id: 'real-id', name: 'Test', isDraft: false, associations: [...] }]`
   - `currentListId: 'real-id'`
4. Llamar `handleCreateMultipleLists(groups, 'real-id')`
5. Verificar `listService.splitList` llamado con `('real-id', groups)` (NO `temp_...`)
6. Verificar `setLists` llamado con mazos nuevos (IDs `id-1`, `id-2`)

**Test específico:**
```typescript
it('usa el ID real del mazo cuando se le pasa realListId', async () => {
  const groups = [{ name: 'Test-2', associations: [...] }]
  const realListId = 'real-id'
  const splitListMock = vi.fn().mockResolvedValue({ ids: ['id-1'] })
  
  const { result } = renderHook(() => useAppActions({ 
    navigate: vi.fn(), 
    showToast: vi.fn(), 
    setLastPlayedId: vi.fn() 
  }))
  
  await act(async () => {
    await result.current.handleCreateMultipleLists(groups, realListId)
  })
  
  expect(splitListMock).toHaveBeenCalledWith(realListId, groups)
})
```

---

## 7. Archivos a Consultar Antes de Escribir Tests

| Test | Leer Archivo Fuente |
|------|---------------------|
| `useDeckImporter` | `src/hooks/dashboard/useDeckImporter.ts` |
| `BulkImport` | `src/components/list-editor/BulkImport.tsx` |
| `BulkImportPanel` | `src/components/views/dashboard/BulkImportPanel.tsx` |
| `ListEditor` (import) | `src/components/ListEditor.tsx` líneas 85, 266-299, 793-798, 839-840 |
| `Dashboard` (crear) | `src/components/views/Dashboard.tsx` líneas 52-58, 235-258 |
| `parseForPreview` | `src/utils/csv.ts` |
| `normalizeAssociations` | `src/utils/normalizeAssociation.ts` |
| `categorizeDeckCards` | `src/utils/deckValidation.ts` |
| `splitAssociationsByMax` | `src/utils/splitAssociations.ts` |
| `validateImportCards` | `src/services/importValidationService.ts` |
| `importSelectedCards` | `src/components/ListEditor.tsx` líneas 300-380 |
| `handleCreateMultipleLists` | `src/App.tsx` (buscar `handleCreateMultipleLists`) |
| `SettingsModal` | `src/components/modals/SettingsModal.tsx` |
| `DeckCategorySelector` | `src/components/onboarding/DeckCategorySelector.tsx` |
| `DeckAnalysisStats` | `src/components/onboarding/DeckAnalysisStats.tsx` |
| `semanticGrouping` | `src/services/grouping/semanticGrouping.ts` |
| `aiService` | `src/services/aiService.ts` |

---

## 8. Notas Importantes

1. **NO mockear lógica interna** - testear comportamiento real
2. **Usar `vi.fn()`** para callbacks, no `jest.fn()`
3. **Testear en español** - la app es en español
4. **Accesibilidad** - usar `getByRole`, `getByLabelText` preferiblemente
5. **Async** - usar `waitFor` o `findBy` para updates asíncronos
6. **Cleanup** - `vi.clearAllMocks()` en `beforeEach` si necesario
7. **Tipos** - importar types desde `@/types`, no `../../types`
8. **Regresión primero** - los 4 tests de regresión son bloqueantes para la refactorización
9. **Tests que pasan = sagrados** - si se rompe uno de los 495, parar y arreglar

---

## 9. Próximos Pasos

1. ✅ **Plan actualizado** - Este documento
2. ⏳ **Aprobación** - Revisar y confirmar
3. 🔧 **Fase 1** - Arreglar 32 tests fallando (tabla de diagnóstico)
4. 🧪 **Fase 2** - Tests de regresión (4) + Unitarios críticos
5. 🧪 **Fase 3** - Unitarios importantes
6. 🔗 **Fase 4** - Integración 2 flujos
7. 🚨 **Fase 5** - Test de humo manual (OBLIGATORIO)
8. 🚀 **Refactorización** - Proceder con plan de unificación