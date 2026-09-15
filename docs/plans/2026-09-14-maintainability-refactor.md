# Plan de Refactorización para Mejorar Mantenibilidad

**Fecha:** 2026-09-14  
**Rama:** `refactor/maintainability-plan`  
**Basado en:** Análisis de `ListEditor.tsx` (1031 líneas), `useAppActions.ts` (567 líneas), `App.tsx` (359 líneas), `firestoreService.ts`, `gameStore.ts`

---

## Resumen de Problemas Críticos Identificados

| # | Problema | Archivo(s) | Severidad |
|---|----------|------------|-----------|
| 1 | **ListEditor.tsx: 1031 líneas** - Componente monolítico que viola Regla 17 (>200 líneas) | `ListEditor.tsx` | 🔴 Crítico |
| 2 | **useAppActions.ts: 567 líneas** - Mezcla lógica de negocio, UI, drafts, sync, quota, activity | `useAppActions.ts` | 🔴 Crítico |
| 3 | **App.tsx: 359 líneas** - 300+ líneas de useCallback/useMemo, lógica de navegación | `App.tsx` | 🟠 Alto |
| 4 | **Drafts (temp_...) como parche** - IDs temporales filtrados por todo el código | `useAppActions.ts`, `ListEditor.tsx`, `App.tsx`, `gameStore.ts` | 🔴 Crítico |
| 5 | **Estado duplicado** - `editList` (local) vs `currentList` (store) vs `lists` (store) | `ListEditor.tsx`, `useAppActions.ts` | 🟠 Alto |
| 6 | **handleUpdateList hace 3 cosas** - Draft save + cloud sync + activity recording | `useAppActions.ts` | 🟠 Alto |
| 7 | **firestoreService.ts plano** - Sin validación de tipos, sin error handling consistente | `firestoreService.ts` | 🟡 Medio |
| 8 | **Tests frágiles** - Mocks de store, crypto.randomUUID(), no cubren casos borde | `tests/` | 🟡 Medio |

---

## Objetivos del Refactor

1. **Eliminar drafts (temp_...)** - Crear mazos en Firestore desde el primer momento
2. **Separar ListEditor en 5-6 componentes** - Single Responsibility Principle
3. **Extraer 4-5 custom hooks** - Separar estado, acciones, quota, traducción
4. **Unificar useAppActions en servicios** - listService, activityService, quotaService
5. **Un solo tipo de ID** - Nada de temp_...; si no está en Firestore, no está en el store
6. **Tests con MSW** - Mock Service Worker en lugar de mocks manuales

---

## Fase 1: Preparación y Tipos (Semana 1)

### 1.1 Definir tipos centrales en `src/types/list-editor.ts`

```typescript
// Nuevo archivo - tipos para ListEditor
export interface ListEditorState {
  editList: AssociationList;
  searchTerm: string;
  activeSort: TableSort | null;
  archivedSort: TableSort | null;
  selectedIds: Set<string>;
  selectedArchivedIds: Set<string>;
  isTranslating: boolean;
  translateLang: string;
  activeTagFilter: string | null;
  isSaving: boolean;
  showBulk: boolean;
  showImportModal: boolean;
  validationResult: ImportValidationResult | null;
  showValidationScreen: boolean;
  nameError: boolean;
  aiSuggestions: AIGroupSuggestion[] | null;
}

export interface ListEditorActions {
  onSave: (list: AssociationList) => Promise<void>;
  onBack: () => void;
  onCreateMultiple: (groups: { name: string; associations: Association[] }[], realListId?: string) => void;
}
```

### 1.2 Crear `src/types/list-service.ts`

```typescript
// Tipos para servicio de listas (reemplaza lógica en useAppActions)
export interface CreateListInput {
  name: string;
  concept: string;
  associations: Association[];
  userId: string;
  settings: ListSettings;
  sourceType?: DeckSourceType;
  sourceUrl?: string;
  rawSourceText?: string;
  sourceRow?: SourceRow;
}

export interface UpdateListInput {
  id: string;
  name?: string;
  concept?: string;
  associations?: Association[];
  settings?: ListSettings;
  isArchived?: boolean;
}

export interface ListService {
  createList(input: CreateListInput): Promise<string>; // retorna ID real de Firestore
  updateList(input: UpdateListInput): Promise<void>;
  deleteList(id: string): Promise<void>;
  splitList(listId: string, groups: { name: string; associations: Association[] }[]): Promise<string[]>;
  getList(id: string): Promise<AssociationList | null>;
}
```

---

## Fase 2: Servicios de Dominio (Semana 1-2)

### 2.1 `src/services/listService.ts` - Responsabilidad única: CRUD de listas

```typescript
// Reemplaza listService actual + lógica de createListCore/handleSaveDraft/handleUpdateList
export class ListServiceImpl implements ListService {
  constructor(
    private firestore: FirestoreService,
    private quotaService: QuotaService,
    private activityService: ActivityService
  ) {}

  async createList(input: CreateListInput): Promise<string> {
    // Validar quota ANTES de crear
    const status = await this.quotaService.checkQuota(input.userId, input.associations.length);
    if (status.level === 'blocked') throw new QuotaExceededError(status.maxCards);
    
    // Crear en Firestore directamente (SIN temp_...)
    const id = await this.firestore.createList({ ...input, isDraft: false });
    
    // Registrar actividad
    await this.activityService.recordCardsCreated(input.userId, id, input.associations);
    
    return id;
  }

  async updateList(input: UpdateListInput): Promise<void> {
    const existing = await this.firestore.getList(input.id);
    if (!existing) throw new ListNotFoundError(input.id);
    
    // Validar quota si crece
    if (input.associations && input.associations.length > existing.associations.length) {
      const status = await this.quotaService.checkQuota(existing.userId, input.associations.length);
      if (status.level === 'blocked') throw new QuotaExceededError(status.maxCards);
    }
    
    // Diff para activity
    if (input.associations) {
      const events = buildListDiffEvents({
        userId: existing.userId,
        listId: input.id,
        before: existing.associations,
        after: input.associations,
      });
      await this.activityService.recordEvents(events);
    }
    
    await this.firestore.updateList(input.id, input);
  }

  async splitList(listId: string, groups: Group[]): Promise<string[]> {
    const list = await this.firestore.getList(listId);
    if (!list) throw new ListNotFoundError(listId);
    
    const newIds = await this.firestore.splitList(listId, groups);
    
    // Activity para cards movidas
    const events = groups.flatMap((g, i) => 
      g.associations.map(a => createActivityEvent({
        userId: list.userId,
        listId: newIds[i],
        cardId: a.id,
        cardTerm: a.term,
        type: 'card_moved',
        fromListId: listId,
        toListId: newIds[i],
      }))
    );
    await this.activityService.recordEvents(events);
    
    return newIds;
  }
}
```

### 2.2 `src/services/quotaService.ts` - Ya existe, mejorar validación

```typescript
// Añadir método checkQuota(userId, projectedCards): Promise<QuotaStatus>
```

### 2.3 `src/services/activityService.ts` - Ya existe, unificar registro

---

## Fase 3: Hooks para ListEditor (Semana 2)

### 3.1 `src/hooks/dashboard/useListEditorState.ts` - Estado y derivados

```typescript
export function useListEditorState(initialList: AssociationList) {
  const [editList, setEditList] = useState<AssociationList>(initialList);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSort, setActiveSort] = useState<TableSort | null>(null);
  const [archivedSort, setArchivedSort] = useState<TableSort | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedArchivedIds, setSelectedArchivedIds] = useState<Set<string>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateLang, setTranslateLang] = useState('es');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportValidationResult | null>(null);
  const [showValidationScreen, setShowValidationScreen] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AIGroupSuggestion[] | null>(null);
  
  // Derivados con useMemo
  const activeAssociations = useMemo(() => editList.associations.filter(a => !a.isArchived), [editList]);
  const archivedAssociations = useMemo(() => editList.associations.filter(a => a.isArchived), [editList]);
  const uniqueTags = useMemo(() => [...new Set(activeAssociations.flatMap(a => a.metadata?.tags || []))].sort(), [activeAssociations]);
  const filteredActive = useMemo(() => activeAssociations.filter(...), [activeAssociations, searchTerm, activeTagFilter]);
  const filteredArchived = useMemo(() => archivedAssociations.filter(...), [archivedAssociations, searchTerm]);
  const sortedActive = useMemo(() => sortAssociations(filteredActive, activeSort), [filteredActive, activeSort]);
  const sortedArchived = useMemo(() => sortAssociations(filteredArchived, archivedSort), [filteredArchived, archivedSort]);
  
  return {
    // Estado
    editList, setEditList,
    searchTerm, setSearchTerm,
    activeSort, setActiveSort,
    archivedSort, setArchivedSort,
    selectedIds, setSelectedIds,
    selectedArchivedIds, setSelectedArchivedIds,
    isTranslating, setIsTranslating,
    translateLang, setTranslateLang,
    activeTagFilter, setActiveTagFilter,
    isSaving, setIsSaving,
    showBulk, setShowBulk,
    showImportModal, setShowImportModal,
    validationResult, setValidationResult,
    showValidationScreen, setShowValidationScreen,
    nameError, setNameError,
    aiSuggestions, setAiSuggestions,
    // Derivados
    activeAssociations,
    archivedAssociations,
    uniqueTags,
    sortedActive,
    sortedArchived,
  };
}
```

### 3.2 `src/hooks/dashboard/useListEditorActions.ts` - Handlers de acciones

```typescript
export function useListEditorActions({
  editList,
  setEditList,
  selectedIds,
  selectedArchivedIds,
  onSave,
  showToast,
  translateLang,
  quota,
  lists,
}: UseListEditorActionsParams) {
  
  const cleanupAndSave = useCallback((listToSave: AssociationList): boolean => {
    // Lógica de limpieza y validación de quota
    // Retorna true si se guardó, false si quota bloqueada
  }, [onSave, quota, lists, showToast]);

  const handleSave = useCallback(async () => {
    if (isSaving) return;
    if (!editList.name.trim()) { setNameError(true); return; }
    setIsSaving(true);
    try {
      const saved = cleanupAndSave(editList);
      if (saved) await onSave(editList);
    } finally { setIsSaving(false); }
  }, [cleanupAndSave, editList, isSaving, onSave, setIsSaving, setNameError]);

  const handleAddRow = useCallback(() => {
    // Validar quota, añadir fila vacía
  }, [quota, lists, showToast, setEditList]);

  const handleUpdateField = useCallback((id: string, field: keyof Association, value: string) => {
    setEditList(current => ({ ...current, associations: current.associations.map(a => a.id === id ? { ...a, [field]: value } : a) }));
  }, [setEditList]);

  const handleUpdateTags = useCallback((id: string, tags: string[]) => {
    setEditList(current => ({ ...current, associations: current.associations.map(a => a.id === id ? { ...a, metadata: { ...a.metadata, tags } } : a) }));
  }, [setEditList]);

  const handleRemoveRow = useCallback((id: string) => {
    cleanupAndSave({ ...editList, associations: editList.associations.filter(a => a.id !== id) });
  }, [editList, cleanupAndSave]);

  const handleTranslateSelected = useCallback(async () => {
    // Lógica de traducción usando translationService
  }, [editList, selectedIds, translateLang, onSave, showToast]);

  const handleBulkAdd = useCallback((text: string) => {
    // Validar quota, parsear, validar import, mostrar ValidationScreen
  }, [editList, quota, lists, showToast, setValidationResult, setShowImportModal, setShowValidationScreen]);

  const importSelectedCards = useCallback(async (categories: Record<CardCategory, boolean>) => {
    // Importar tarjetas seleccionadas, manejar split si > 100
    // SIN temp_... - crear en Firestore directamente
  }, [validationResult, editList, onSave, onCreateMultiple, showToast, onBack, setShowValidationScreen]);

  return {
    cleanupAndSave,
    handleSave,
    handleAddRow,
    handleUpdateField,
    handleUpdateTags,
    handleRemoveRow,
    handleTranslateSelected,
    handleBulkAdd,
    importSelectedCards,
  };
}
```

### 3.3 `src/hooks/dashboard/useListEditorQuota.ts` - Quota logic

```typescript
export function useListEditorQuota(editList: AssociationList, lists: AssociationList[], quota: UserQuota | null) {
  const projectedTotal = useMemo(() => {
    const otherTotal = lists.filter(l => l.id !== editList.id).reduce((sum, l) => sum + (l.associations?.length || 0), 0);
    return otherTotal + editList.associations.length;
  }, [lists, editList]);

  const quotaStatus = useMemo(() => {
    if (!quota) return null;
    return QuotaService.getStatus(projectedTotal, quota.tier);
  }, [quota, projectedTotal]);

  const translationUsed = useRef(quota?.translationCharsUsed ?? 0);
  const translationLimit = quota?.translationCharLimit ?? 20000;
  const translationPercentage = Math.min(100, (translationUsed.current / translationLimit) * 100);
  const translationState = translationPercentage >= 100 ? 'blocked' : translationPercentage >= 70 ? 'warning' : 'ok';

  return { quotaStatus, translationUsed, translationLimit, translationPercentage, translationState };
}
```

### 3.4 `src/hooks/dashboard/useListEditorTranslation.ts` - Translation logic

---

## Fase 4: Componentes de ListEditor (Semana 2-3)

### Estructura de archivos nueva:
```
src/components/list-editor/
├── ListEditor.tsx              # Componente principal (~150 líneas)
├── ListEditorHeader.tsx        # Header con botón back + nombre del mazo
├── ListEditorToolbar.tsx       # Toolbar: search, bulk actions, add row, import
├── ListEditorTable.tsx         # Tabla activa + archivada (wrapper)
├── ListEditorFooter.tsx        # Footer sticky con contador + botón guardar
├── ListEditorBulkImport.tsx    # Modal/panel de importación masiva
├── ListEditorValidationModal.tsx # Modal de validación de import
├── ListEditorTagFilter.tsx     # Filtro de tags
├── ListEditorTranslationBar.tsx # Barra de quota de traducción
└── index.ts                    # Exports
```

### 4.1 `ListEditor.tsx` - Nuevo componente principal (~150 líneas)

```tsx
export const ListEditor: React.FC<ListEditorProps> = ({
  list,
  initialEditId,
  onInitialEditConsumed,
  onSave,
  onBack,
  onBackLabel,
  onCreateMultiple,
}) => {
  const { showToast } = useToast();
  const quota = useGameStore(state => state.quota);
  const lists = useGameStore(state => state.lists);
  
  // Usar hooks extraídos
  const state = useListEditorState(list);
  const actions = useListEditorActions({ ...state, onSave, onCreateMultiple, showToast, quota, lists });
  const quotaData = useListEditorQuota(state.editList, lists, quota);
  const { autoOpenActiveId, autoOpenArchivedId } = useAutoOpenIds(initialEditId, state.activeAssociations, state.archivedAssociations);
  
  useEffect(() => { if (initialEditId) onInitialEditConsumed?.(); }, [initialEditId, onInitialEditConsumed]);
  useEffect(() => { actions.cleanupAndSave(list); }, [list, actions.cleanupAndSave]);

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <QuotaAlert status={quotaData.quotaStatus} />
      
      {state.showValidationScreen && (
        <ListEditorValidationModal
          validationResult={state.validationResult}
          onConfirmImport={actions.importSelectedCards}
          onBack={actions.handleBackToEditor}
          deckName={state.editList.name}
        />
      )}

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden relative">
        <ListEditorHeader onBack={actions.handleBack} onBackLabel={onBackLabel} />
        <ListEditorNameSection 
          name={state.editList.name} 
          onRename={actions.handleRename}
          onRenameBlur={actions.handleRenameBlur}
          nameError={state.nameError}
        />
        <ListEditorToolbar
          searchTerm={state.searchTerm}
          onSearchChange={state.setSearchTerm}
          selectedCount={state.selectedIds.size}
          translateLang={state.translateLang}
          onTranslateLangChange={state.setTranslateLang}
          isTranslating={state.isTranslating}
          onTranslate={actions.handleTranslateSelected}
          onDelete={actions.handleDeleteSelected}
          onExport={actions.handleExportSelected}
          onAddRow={actions.handleAddRow}
          isAddRowDisabled={!isPremium && quotaData.quotaStatus?.level === 'blocked'}
          showBulk={state.showBulk}
          onToggleBulk={state.setShowBulk}
          onBulkAdd={actions.handleBulkAdd}
        />
        <ListEditorTagFilter
          tags={quotaData.uniqueTags}
          activeFilter={state.activeTagFilter}
          onFilterChange={state.setActiveTagFilter}
          activeCount={state.activeAssociations.length}
        />
        {state.showBulk && <ListEditorBulkImport onBulkAdd={actions.handleBulkAdd} />}
        {state.showImportModal && <CreateListForm ... />}
        <ListEditorTranslationBar
          selectedCount={state.selectedIds.size}
          translationUsed={quotaData.translationUsed}
          translationLimit={quotaData.translationLimit}
          translationPercentage={quotaData.translationPercentage}
          translationState={quotaData.translationState}
        />
        <ListEditorTable
          activeAssociations={state.sortedActive}
          archivedAssociations={state.sortedArchived}
          activeSort={state.activeSort}
          archivedSort={state.archivedSort}
          onActiveSortChange={actions.handleActiveSortChange}
          onArchivedSortChange={actions.handleArchivedSortChange}
          termHeader={termHeader}
          definitionHeader={definitionHeader}
          onUpdateField={actions.handleUpdateField}
          onUpdateTags={actions.handleUpdateTags}
          onBlurRow={actions.handleBlurRow}
          onRemoveRow={actions.handleRemoveRow}
          onRestoreRow={actions.handleRestoreRow}
          selectedIds={state.selectedIds}
          selectedArchivedIds={state.selectedArchivedIds}
          onToggleActiveSelect={actions.handleToggleActiveSelect}
          onToggleArchivedSelect={actions.handleToggleArchivedSelect}
          autoOpenActiveId={autoOpenActiveId}
          autoOpenArchivedId={autoOpenArchivedId}
        />
        <ListEditorFooter
          totalCards={state.editList.associations.length}
          isSaving={state.isSaving}
          onSave={actions.handleSave}
          hasName={state.editList.name.trim() !== ''}
          nameError={state.nameError}
          onNameFocus={() => document.getElementById('list-name')?.focus()}
          showToast={showToast}
        />
      </div>

      {state.aiSuggestions && (
        <SmartGroupModal ... />
      )}
    </div>
  );
};
```

---

## Fase 5: Refactor App.tsx y Navegación (Semana 3)

### 5.1 Extraer hooks de navegación

```typescript
// src/hooks/app/useNavigation.ts
export function useNavigation() {
  const [view, setView] = useState<AppView>('dashboard');
  const historyRef = useRef<AppView[]>([]);
  const clearListContext = useCallback(() => { ... }, []);
  
  const navigate = useCallback((nextView: AppView) => { ... }, [clearListContext]);
  const goBack = useCallback(() => { ... }, [clearListContext]);
  
  return { view, navigate, goBack, isReturningToGame: historyRef.current[historyRef.current.length - 1] === 'game' };
}
```

### 5.2 Extraer handlers de app

```typescript
// src/hooks/app/useAppHandlers.ts
export function useAppHandlers({ navigate, showToast, setLastPlayedId }: UseAppHandlersParams) {
  const listService = useListService(); // nuevo hook que provee ListService
  const quotaService = useQuotaService();
  
  const handlePlayList = useCallback((id: string) => { ... }, [navigate, setLastPlayedId]);
  const handleCreateList = useCallback(async (name, concept, assocs) => { 
    const id = await listService.createList({ name, concept, associations: assocs, ... });
    if (id) navigate('editor');
  }, [listService, navigate]);
  const handleUpdateList = useCallback(async (list: AssociationList) => {
    await listService.updateList({ id: list.id, name: list.name, concept: list.concept, associations: list.associations });
  }, [listService]);
  const handleCreateMultipleLists = useCallback(async (groups, realListId) => {
    await listService.splitList(realListId!, groups);
  }, [listService]);
  const handleDeleteList = useCallback(async (id: string) => {
    await listService.deleteList(id);
  }, [listService]);
  
  return { handlePlayList, handleCreateList, handleUpdateList, handleCreateMultipleLists, handleDeleteList, ... };
}
```

### 5.3 `App.tsx` simplificado (~100 líneas)

```tsx
const AppContent: React.FC = () => {
  const { showToast } = useToast();
  const { view, navigate, goBack, isReturningToGame } = useNavigation();
  const { lastPlayedId, setLastPlayedId } = useAppBootstrap(navigate);
  const handlers = useAppHandlers({ navigate, showToast, setLastPlayedId });
  const { user, lists, currentList, isLoaded, ... } = useGameStoreSelectors();
  
  // ... resto simplificado
};
```

---

## Fase 6: Eliminar Drafts y temp_... (Semana 3-4)

### 6.1 Cambios en `gameStore.ts`

- Eliminar `isDraft` de `AssociationList` type
- Eliminar lógica de `temp_` IDs en `syncToCloud`
- `syncToCloud` solo sincroniza listas que YA existen en Firestore
- `createList` en store recibe ID real de Firestore

### 6.2 Cambios en `useAppActions.ts` → servicios

- `createListCore` → `listService.createList()` (retorna ID real)
- `handleSaveDraft` → **ELIMINAR** (ya no existe draft)
- `handleUpdateList` → `listService.updateList()` (solo update, sin lógica draft)
- `handleCreateMultipleLists` → `listService.splitList()` (usa ID real)

### 6.3 Búsqueda y reemplazo de `temp_` en todo el código

```bash
grep -r "temp_" src/ --include="*.ts" --include="*.tsx"
grep -r "isDraft" src/ --include="*.ts" --include="*.tsx"
grep -r "startsWith('temp_')" src/ --include="*.ts" --include="*.tsx"
```

Archivos a revisar/modificar:
- `src/hooks/app/useAppActions.ts`
- `src/components/ListEditor.tsx`
- `src/App.tsx`
- `src/store/gameStore.ts`
- `src/components/views/Dashboard.tsx`
- `src/components/views/dashboard/CreateListForm.tsx`
- `src/components/views/TextImporter.tsx`
- `src/components/onboarding/DeckStoreOnboarding.tsx`

---

## Fase 7: Tests con MSW (Semana 4)

### 7.1 Configurar MSW

```bash
npm install -D msw @types/msw
```

### 7.2 `tests/handlers/listHandlers.ts`

```typescript
import { http, HttpResponse } from 'msw';

export const listHandlers = [
  http.post('/api/createList', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ id: `list_${Date.now()}` });
  }),
  http.patch('/api/updateList/:id', async ({ request, params }) => {
    const body = await request.json();
    return HttpResponse.json({ success: true });
  }),
  http.post('/api/splitList', async ({ request }) => {
    const { groups } = await request.json();
    return HttpResponse.json({ ids: groups.map((_, i) => `list_${Date.now()}_${i}`) });
  }),
  http.delete('/api/deleteList/:id', () => HttpResponse.json({ success: true })),
];
```

### 7.3 Tests de integración reales

```typescript
// tests/integration/listEditor.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ListEditor } from '../../src/components/ListEditor';
import { server } from '../mocks/server';
import { listHandlers } from '../handlers/listHandlers';

beforeAll(() => server.listen(...listHandlers));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('crea lista en Firestore y edita', async () => {
  const mockOnSave = vi.fn();
  render(<ListEditor list={mockList} onSave={mockOnSave} onBack={vi.fn()} />);
  
  // Añadir tarjeta
  fireEvent.click(screen.getByText('+ Añadir tarjeta'));
  fireEvent.change(screen.getByPlaceholderText('Término'), { target: { value: 'hola' } });
  fireEvent.blur(screen.getByPlaceholderText('Término'));
  
  await waitFor(() => expect(mockOnSave).toHaveBeenCalled());
  expect(mockOnSave).toHaveBeenCalledWith(expect.objectContaining({
    associations: expect.arrayContaining([expect.objectContaining({ term: 'hola' })])
  }));
});

test('divide lista en múltiples mazos al importar >100 tarjetas', async () => {
  // Test con MSW interceptando splitList
});
```

---

## Fase 8: Limpieza y Validación (Semana 4-5)

### 8.1 Verificar TypeScript

```bash
npx tsc --noEmit
# Debe dar 0 errores
```

### 8.2 Ejecutar tests

```bash
npx vitest run
# Todos los tests deben pasar
```

### 8.3 Verificar build

```bash
npm run build
# Build exitoso
```

### 8.4 Verificar archivos modificados

```bash
git diff --name-only
# Lista de archivos cambiados
```

---

## Checklist de Validación Final

- [ ] `npx tsc --noEmit` → 0 errores
- [ ] `npx vitest run` → todos los tests pasan
- [ ] `npm run build` → build exitoso
- [ ] No quedan referencias a `temp_` en el código
- [ ] No quedan referencias a `isDraft` en el código
- [ ] `ListEditor.tsx` < 200 líneas
- [ ] `useAppActions.ts` eliminado o < 100 líneas (solo delega a servicios)
- [ ] `App.tsx` < 150 líneas
- [ ] Servicios en `src/services/` con responsabilidad única
- [ ] Hooks en `src/hooks/dashboard/` para ListEditor
- [ ] Tests usan MSW, no mocks manuales de store
- [ ] `crypto.randomUUID()` mockeado en tests para determinismo

---

## Riesgos y Mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Regresiones en sync cloud | Media | Alto | Tests de integración con MSW cubriendo syncToCloud/syncFromCloud |
| Pérdida de datos draft | Baja | Crítico | Eliminar drafts en fases: 1) crear en Firestore, 2) migrar existentes, 3) limpiar código |
| Quota validation rota | Media | Alto | Tests unitarios exhaustivos de quotaService |
| Split list roto | Media | Alto | Test de integración específico para splitList con MSW |
| Performance (re-renders) | Media | Medio | React DevTools Profiler, useMemo/useCallback correctos |

---

## Orden de Implementación Recomendado

1. **Fase 1-2**: Tipos + Servicios (base sólida, sin romper UI)
2. **Fase 3**: Hooks (lógica extraída, testeable en aislamiento)
3. **Fase 4**: Componentes (UI separada, pasa props a hooks)
4. **Fase 5**: App.tsx + navegación (simplifica raíz)
5. **Fase 6**: Eliminar drafts/temp_ (cambio breaking, pero base lista)
6. **Fase 7**: Tests MSW (valida todo funciona)
7. **Fase 8**: Validación final

---

## Notas Importantes

- **NO codificar hasta confirmación explícita**
- Cada fase debe validarse con `tsc --noEmit` antes de continuar
- Commits atómicos por fase
- Mantener `main` intacto; todo en rama `refactor/maintainability-plan`