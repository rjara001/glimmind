# Plan: Unificar Flujos de Importación Masiva (Bulk Import)

## Fecha
2026-09-14

## Problema
Existen **dos implementaciones separadas** para la misma funcionalidad (importar CSV):
1. **Dashboard → "Nueva Lista"** → `CreateListForm` + `BulkImportPanel` + `useDeckImporter`
2. **Editor de Lista → "📥 Importar"** → `BulkImport` (lógica interna)

Esto causa:
- Código duplicado (parse, preview, validación, UI)
- Inconsistencias (auto-nombre de archivo solo en Flujo 1)
- Bugs que se arreglan en uno pero no en el otro
- Mantenimiento doble

---

## Análisis Detallado

### Flujo 1: Dashboard (Crear Lista Nueva)
**Archivos:**
- `src/components/views/Dashboard.tsx` (líneas 52-58, 235-258)
- `src/components/views/dashboard/CreateListForm.tsx`
- `src/components/views/dashboard/BulkImportPanel.tsx`
- `src/hooks/dashboard/useDeckImporter.ts`

**Características:**
- Usa hook compartido `useDeckImporter`
- Estado: `bulkData`, `parsedData`, `importTab`, `selectedFileName`, `fileAssociations`, `isReadingFile`
- Callbacks: `onImportSuccess`, `onImportError` (toast/alert)
- Parse: `parseForPreview` + `normalizeAssociations`
- Preview: `renderMappingBadge` + `renderPreviewTable`
- Botón "Process Import" → llama `onSubmit` del formulario → `handleSubmitCreate` → `onCreate(newName, newConcept, initialAssocs)`
- Auto-nombre de archivo: implementado en Dashboard.tsx (useEffect línea 61-69)

### Flujo 2: Editor (Importar a Lista Existente)
**Archivos:**
- `src/components/ListEditor.tsx` (líneas 85, 266-299, 793-798, 839-840)
- `src/components/list-editor/BulkImport.tsx`

**Características:**
- Estado local en `BulkImport`: `bulkText`, `parsedData`, `importTab`, `isReadingFile`
- Parse: `parseForPreview` (igual que Flujo 1)
- Preview: `renderMappingBadge` + `renderPreviewTable` (igual que Flujo 1)
- File handling: `handleFileSelect` (lee archivo, setea `bulkText` y `parsedData`, cambia a tab "paste")
- Botón "Process Import" → llama `onBulkAdd(bulkText)` → `handleBulkAdd` en ListEditor
- `handleBulkAdd`: valida cuota, parsea, valida duplicados (`validateImportCards`), abre `ValidationScreen`
- **NO tiene** `selectedFileName`, `fileAssociations`, auto-nombre

---

## Diferencias Clave

| Aspecto | Flujo 1 (Dashboard) | Flujo 2 (Editor) |
|---------|---------------------|------------------|
| Hook | `useDeckImporter` | Ninguno (estado local) |
| File state | `selectedFileName`, `fileAssociations` | Solo `bulkText` + `parsedData` |
| File read | `handleFileChange` (hook) | `handleFileSelect` (componente) |
| Tab switch on file | No (se queda en "upload") | Sí (cambia a "paste") |
| Auto-nombre | ✅ Implementado | ❌ No |
| Validación cuota | En `handleSubmitCreate` | En `handleBulkAdd` |
| Validación duplicados | No (crea lista nueva) | Sí (`validateImportCards`) |
| Destino | `onCreate` (nueva lista) | `ValidationScreen` → `importSelectedCards` → `onSave`/`onCreateMultiple` |

---

## Plan de Unificación

### Fase 1: Extender `useDeckImporter` para soportar ambos casos

**Archivo:** `src/hooks/dashboard/useDeckImporter.ts`

**Cambios:**
1. Agregar opción `mode: 'create' | 'import'` al hook
2. Agregar callback `onFileSelect?: (file: File) => void` para auto-nombre
3. Agregar callback `onBulkAdd?: (text: string) => void` para Flujo 2
4. Exponer `handleFileSelect` (wrapper que lee archivo y llama callbacks)
5. Mantener compatibilidad hacia atrás

**Nueva interfaz:**
```typescript
export interface DeckImporterOptions {
  mode: 'create' | 'import';
  onImportSuccess?: (message: string) => void;
  onImportError?: (message: string) => void;
  onFileSelect?: (fileName: string) => void; // para auto-nombre
  onBulkAdd?: (text: string) => void; // para Flujo 2
}

export function useDeckImporter(options: DeckImporterOptions): DeckImporterState
```

### Fase 2: Refactorizar `BulkImport.tsx` para usar el hook

**Archivo:** `src/components/list-editor/BulkImport.tsx`

**Cambios:**
1. Eliminar estado local (`bulkText`, `parsedData`, `importTab`, `isReadingFile`, `fileInputRef`)
2. Usar `useDeckImporter` con `mode: 'import'`
3. Conectar `onBulkAdd` prop al hook
4. Mantener misma UI (tabs, textarea, preview, botones)
5. Agregar `selectedFileName` display en tab "upload" (igual que BulkImportPanel)

### Fase 3: Actualizar `ListEditor.tsx`

**Archivo:** `src/components/ListEditor.tsx`

**Cambios:**
1. Importar `useDeckImporter` 
2. Crear instancia del hook en el componente (o pasarla como prop)
3. Conectar `onBulkAdd` del hook al `handleBulkAdd` existente
4. Eliminar `showBulk` state local (usar del hook)
5. Simplificar botón "📥 Importar" → solo `setShowBulk(true)`

### Fase 4: Unificar componentes de UI (Opcional - Mejora)

**Objetivo:** Un solo componente `BulkImportPanel` para ambos flujos

**Opciones:**
- **A:** `BulkImport.tsx` se convierte en wrapper que usa `BulkImportPanel` internamente
- **B:** `BulkImportPanel` se hace genérico y se usa en ambos lados
- **C:** Mantener ambos pero que usen el mismo hook

**Recomendación:** Opción B - `BulkImportPanel` ya es más limpio y usa el hook. `BulkImport` se refactoriza para usar `BulkImportPanel` + hook.

### Fase 5: Auto-nombre unificado

El auto-nombre (extraer nombre del archivo sin extensión) se mueve al hook:
- En `handleFileChange` / `handleFileSelect`: después de `setSelectedFileName`, llamar `onFileSelect?.(file.name)`
- El consumidor (Dashboard o ListEditor) decide qué hacer con el nombre
- Dashboard: setea `newName` si está vacío
- ListEditor: setea `editList.name` si está vacío

---

## Archivos a Modificar

### Nuevos / Principales
1. `src/hooks/dashboard/useDeckImporter.ts` - Extender hook
2. `src/components/list-editor/BulkImport.tsx` - Refactor completo para usar hook
3. `src/components/ListEditor.tsx` - Conectar hook, simplificar

### Secundarios
4. `src/components/views/dashboard/BulkImportPanel.tsx` - Verificar compatibilidad (ya usa hook)
5. `src/components/views/Dashboard.tsx` - Verificar que sigue funcionando

---

## Pasos de Implementación (Orden)

1. **Extender hook** (`useDeckImporter.ts`) - agregar `mode`, callbacks, `handleFileSelect`
2. **Test hook en Dashboard** - verificar que no rompe Flujo 1
3. **Refactor `BulkImport.tsx`** - usar hook, eliminar estado local
4. **Actualizar `ListEditor.tsx`** - instanciar hook, conectar callbacks
5. **Test Flujo 2** - verificar import en editor funciona
6. **Unificar auto-nombre** - mover lógica al hook, consumir en ambos lados
7. **Cleanup** - eliminar código duplicado, verificar no hay regresiones

---

## Criterios de Aceptación

- [ ] Ambos flujos usan `useDeckImporter`
- [ ] Auto-nombre funciona en ambos flujos
- [ ] Parse/preview idéntico en ambos
- [ ] Validación cuota funciona en ambos
- [ ] Validación duplicados funciona en Flujo 2
- [ ] No hay código duplicado de parse/preview/file-handling
- [ ] Tests pasan (si existen)
- [ ] `npx tsc --noEmit` sin errores nuevos
- [ ] Build exitoso

---

## Riesgos y Mitigación

| Riesgo | Mitigación |
|--------|------------|
| Romper Flujo 1 (Dashboard) | Testear primero en Dashboard antes de tocar Editor |
| Diferencias sutiles en comportamiento | Documentar diferencias en tabla arriba, testear cada caso |
| `ValidationScreen` solo en Flujo 2 | Mantener callback `onBulkAdd` separado del flujo de creación |
| `onCreateMultiple` solo en Flujo 2 | El hook no maneja esto, queda en `ListEditor` |

---

## Notas Adicionales

- El hook `useDeckImporter` actualmente está en `src/hooks/dashboard/` pero se usa en `ListEditor` (no dashboard). Considerar moverlo a `src/hooks/` compartido o `src/hooks/import/`.
- `BulkImportPanel` recibe muchas props (18). Al usar hook directamente, se simplifica drásticamente.
- El tab "upload" en `BulkImport` cambia a "paste" tras leer archivo. `BulkImportPanel` no lo hace. Decidir comportamiento unificado (recomendado: no cambiar tab, mostrar preview en "upload").

---

## Próximos Pasos

1. **Revisar y aprobar** este plan
2. **Ejecutar Fase 1** (extender hook)
3. **Validar** en Dashboard
4. **Ejecutar Fase 2-3** (refactor Editor)
5. **Validar** ambos flujos
6. **Ejecutar Fase 4-5** (unificación UI + auto-nombre)