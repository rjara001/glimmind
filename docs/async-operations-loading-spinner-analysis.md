# Análisis de Operaciones Asíncronas Sin Spinners de Carga

**Fecha:** 2026-10-07  
**Proyecto:** Glimmind  
**Autor:** Análisis automático de código

---

## Resumen Ejecutivo

Se identificaron **45 operaciones asíncronas** en la codebase, de las cuales **28 ya tienen estados de carga implementados** y **17 carecen completamente de feedback visual** durante la ejecución.

---

## ✅ Operaciones CON Estado de Carga (28)

| # | Componente/Hook | Operación | Estado Implementado |
|---|-----------------|-----------|---------------------|
| 1 | `useDeckImporter.ts` | Lectura de archivo | `isReadingFile` ✅ |
| 2 | `useDeckImporter.ts` | Extracción keywords | `isExtracting` ✅ |
| 3 | `CreateYouTubeDeckModal.tsx` | Análisis video YouTube | `isLoading` ✅ |
| 4 | `CreateYouTubeDeckModal.tsx` | Transcripción manual | `isSubmittingFallback` ✅ |
| 5 | `TextImporter.tsx` | Generar vocabulario | `isLoading` ✅ |
| 6 | `TextImporter.tsx` | Traducción selección | `isTranslating` ✅ |
| 7 | `SettingsView.tsx` | Toggle premium | `isLoading` ✅ |
| 8 | `AdminUsageView.tsx` | Fetch reporte admin | `isLoading` + skeleton ✅ |
| 9 | `HistoryView.tsx` | Cargar actividad | `activityLoading` (store) ✅ |
| 10 | `VoiceRecordingsModal.tsx` | Refresh grabaciones | `isLoading` prop ✅ |
| 11 | `useVoiceRecordings.ts` | Load grabaciones | `isLoading` ✅ |
| 12 | `DeckStoreOnboarding.tsx` | Fetch decks prebuilt | `isLoading` + skeleton ✅ |
| 13 | `ValidationScreen.tsx` (list-editor) | Importar tarjetas | `isImporting` prop ✅ |
| 14 | `useGameStore.ts` | Carga inicial | `isLoading` ✅ |
| 15 | `useGameStore.ts` | Sync activity | `activityLoading` ✅ |
| 16 | `useGameStore.ts` | Load sessions | `sessionsLoading` ✅ |
| 17 | `useGameStore.ts` | Flush sync | `syncInProgress` Set ✅ |
| 18 | `useAppHandlers.ts` | Sync from cloud | `isSyncing` ✅ |
| 19 | `useGameVoice.ts` | TTS/STT voice | `phase` (idle/speaking/listening/evaluating/feedback) ✅ |
| 20 | `GameView.tsx` | Voice recordings | `recordingsLoading` ✅ |
| 21 | `useListEditorActions.ts` | Traducir seleccionadas | `isTranslating` ✅ |
| 22 | `useListEditorActions.ts` | Importar seleccionadas | `isImporting` ✅ |

---

## ❌ Operaciones SIN Estado de Carga (17) - **REQUIEREN IMPLEMENTACIÓN**

### 🔴 Prioridad ALTA - Dashboard / List Editor (Acciones principales de usuario)

| # | Archivo | Función/Línea | Operación Async | Impacto |
|---|---------|---------------|-----------------|---------|
| 1 | `Dashboard.tsx` | `handleOnboardingAddDeck` (127-132) | `onCreateAndPlay()` → Firestore create | Usuario no sabe si se está creando el mazo |
| 2 | `Dashboard.tsx` | `handleStoreAddDeck` (134-139) | `onAddDeck()` → Firestore create | Sin feedback visual |
| 3 | `Dashboard.tsx` | `handleSubmitCreate` (85-102) | `onCreate()` → Firestore create | Crear lista sin spinner |
| 4 | `Dashboard.tsx` | `handleCreateEmpty` (81-83) | `onCreateEmpty()` → navegación | Sin feedback visual |
| 5 | `ListEditor.tsx` | `handleSaveClick` (128-161) | `onCreateList()` / `handleSave()` | Tiene `isSaving` pero **NO hay spinner en UI** |
| 6 | `useListEditorActions.ts` | `handleSave` (167-184) | `onSave()` → `listService.updateList()` | Solo deshabilita botón, no muestra spinner |
| 7 | `DeckStoreOnboarding.tsx` | `handleImportConfirm` (81-107) | `onAddDeck()` → create list | Sin spinner durante importación |
| 8 | `DeckValidationScreen.tsx` | `onAddSelected` (105-121) | Callback padre | **Falta prop `isLoading`** |

### 🟡 Prioridad MEDIA - App.tsx / useAppHandlers.ts (Wrappers de handlers)

| # | Archivo | Función | Operación | Comentario |
|---|---------|---------|-----------|------------|
| 9 | `App.tsx` | `handleCreate` (54-92) | `handlers.handleCreateList()` | No expone loading |
| 10 | `App.tsx` | `handleCreateAndPlay` (102-107) | `handlers.handleCreateListAndPlay()` | No expone loading |
| 11 | `App.tsx` | `handleAddDeck` (134-139) | `handlers.handleAddDeck()` | No expone loading |
| 12 | `App.tsx` | `onSaveList` (148-154) | `handlers.handleUpdateList()` | No expone loading |
| 13 | `App.tsx` | Effects YouTube/Text (167-253) | Múltiples `handleCreateList()` | Bulk creation sin feedback |
| 14 | `useAppHandlers.ts` | `handleCreateList` (179-237) | `listService.createList()` | **Necesita retornar `isCreating`** |
| 15 | `useAppHandlers.ts` | `handleUpdateList` (246-310) | `listService.updateList()` | **Necesita retornar `isUpdating`** |
| 16 | `useAppHandlers.ts` | `handleDeleteList` (312-339) | `listService.deleteList()` | **Necesita retornar `isDeleting`** |
| 17 | `useAppHandlers.ts` | `handleCreateMultipleLists` (341-358) | `listService.splitList()` | **Necesita retornar `isSplitting`** |

### 🟠 Prioridad BAJA - Store / Voice Recordings

| # | Archivo | Función | Operación | Comentario |
|---|---------|---------|-----------|------------|
| 18 | `useVoiceRecordings.ts` | `handleRecordingAvailable` (102-160) | `transcribeSpeech()` + `addRecording()` | Transcripción sin loading |
| 19 | `useVoiceRecordings.ts` | `handleDeleteRecording` (184-191) | `voiceRecordingService.deleteRecording()` | Delete sin loading |
| 20 | `useGameStore.ts` | `loadQuota` (590-597) | `quotaService.fetchQuota()` | Sin loading state |
| 21 | `useGameStore.ts` | `loadSettings` (599-612) | `settingsService.fetchSettings()` | Sin loading state |
| 22 | `useGameStore.ts` | `syncFromCloud` (900-925) | `listService.fetchListsByUser()` | No expone loading |

---

## 📋 Plan de Implementación Recomendado

### Fase 1: Handlers Centralizados (useAppHandlers.ts)
```typescript
// Agregar al return type:
interface UseAppHandlersReturn {
  // ... existing
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isSplitting: boolean;
}
```

### Fase 2: Dashboard.tsx
- Usar `isCreating` de handlers para mostrar spinner en botones de crear
- Agregar `isLoading` local para `handleOnboardingAddDeck` / `handleStoreAddDeck`

### Fase 3: ListEditor / useListEditorActions
- Agregar spinner real en `ListEditorFooter` cuando `isSaving=true`
- Conectar `isUpdating`/`isCreating` de handlers

### Fase 4: DeckValidationScreen
- Agregar prop `isLoading?: boolean`
- Mostrar spinner en botón "Agregar tarjetas"
- Conectar desde `DeckStoreOnboarding.handleImportConfirm`

### Fase 5: Voice Recordings
- Agregar `isTranscribing` / `isDeleting` en `useVoiceRecordings`
- Exponer en `VoiceRecordingsModal`

### Fase 6: GameStore
- Agregar `quotaLoading`, `settingsLoading`, `syncLoading` states
- Exponer en selectors

---

## Archivos a Modificar (Orden Recomendado)

1. `src/hooks/app/useAppHandlers.ts` - **Base: agregar estados loading a todos los handlers**
2. `src/components/views/Dashboard.tsx` - **Consumir isCreating/isUpdating de handlers**
3. `src/components/ListEditor.tsx` + `src/hooks/dashboard/useListEditorActions.ts` - **Spinner real en save**
4. `src/components/onboarding/DeckValidationScreen.tsx` - **Agregar prop isLoading**
5. `src/components/onboarding/DeckStoreOnboarding.tsx` - **Usar isLoading en importConfirm**
6. `src/hooks/voice/useVoiceRecordings.ts` - **Estados transcribing/deleting**
7. `src/store/gameStore.ts` - **Estados quota/settings/sync loading**
8. `src/App.tsx` - **Consumir nuevos estados de handlers**

---

## Criterios de Aceptación

- [ ] Toda operación que escriba en Firestore tenga spinner visible
- [ ] Botones deshabilitados durante carga + spinner animado
- [ ] No bloquear UI completa (spinners inline en botones/acciones)
- [ ] Consistencia visual: usar mismo componente Spinner en toda la app
- [ ] Tests actualizados para verificar estados de carga

---

## Notas Técnicas

- **Patrón actual:** La mayoría usa `disabled={isLoading}` pero **falta el spinner visual**
- **Componente Spinner sugerido:** `<div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />` inline en botones
- **Store pattern:** `useGameStore` ya tiene `isLoading`, `activityLoading`, `sessionsLoading`, `syncInProgress` - extender este patrón
- **Handlers pattern:** `useAppHandlers` ya tiene `isSyncing` - extender a CRUD operations