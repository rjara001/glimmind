# Plan: "Crear nueva lista" en QuickAddModal

## Objetivo
Agregar una opción "Crear nueva lista" dentro de las listas sugeridas del modal `QuickAddModal`, de forma que al seleccionarla se cree la lista y se agregue el valor en un solo flujo (opción B).

## Archivos afectados
- `src/components/modals/QuickAddModal.tsx`
- `src/App.tsx`
- `src/hooks/app/useAppActions.ts`

## Decisiones tomadas
- Flujo opción B: crear lista y agregar el valor en un solo paso, cerrar modal y mostrar toast.
- Reutilizar la lógica de creación de listas existente en `handleCreateList` sin navegar al editor.
- El concepto de la nueva lista será ingresado por el usuario (no inferido automáticamente) para evitar magia no deseada.
- No se modifica `recommendList.ts` ni el store.

## Tareas de implementación

### 1. Extender `QuickAddModalProps`
- Agregar prop `onCreateList: (name: string, concept: string) => Promise<string>` que devuelva el `id` de la lista creada.

### 2. Agregar estado para crear lista
En `QuickAddModal`, agregar:
- `const [isCreatingList, setIsCreatingList] = useState(false);`
- `const [newListName, setNewListName] = useState('');`
- `const [newListConcept, setNewListConcept] = useState('');`

### 3. Insertar botón "Crear nueva lista" en las recomendaciones
Dentro del `<ul>` de recomendaciones (después de `recommendations.slice(0, 3).map(...)`), agregar un `<li>` con un botón:
- Texto: `Crear nueva lista`
- Icono: `+`
- onClick: `() => setIsCreatingList(true)`
- Estilo coherente con las tarjetas de recomendación.

### 4. Mostrar formulario de creación de lista
Cuando `isCreatingList` sea `true`, renderizar un bloque con:
- Input `Nombre de la lista` (requerido).
- Input `Concepto / tema` (opcional).
- Botón secundario para cancelar y volver a las recomendaciones.
- Botón principal `Crear lista y agregar valor` (deshabilitado si falta el nombre).

### 5. Implementar la creación y selección automática
Al confirmar la creación:
1. Llamar a `onCreateList(newListName, newListConcept)`.
2. Con el `listId` devuelto, llamar a `onAdd(listId, newTerm, newDefinition)`.
3. Llamar a `onClose()`.
4. Mostrar toast desde el padre.

### 6. Exponer `onCreateList` en `App.tsx`
- Crear una variante `handleCreateListQuick` en `useAppActions.ts` que ejecute la misma lógica de `handleCreateList` pero sin llamar a `navigate('editor')`.
- Alternativa más limpia: extraer la lógica de creación a una función interna `createListCore` usada por ambos handlers.
- En `App.tsx`, pasar `onCreateList={handleCreateListQuick}` al `QuickAddModal`.

### 7. Manejo de edge cases
- **Invitado**: la lista se crea con `temp_` ID local y el valor se agrega correctamente.
- **Usuario autenticado**: esperar a que se cree en cloud y se devuelva el ID definitivo antes de agregar el valor.
- **Quota**: la lista vacía no consume tarjetas, pero la acción de agregar 1 tarjeta sí debe validar quota en `onAdd`.
- **Error en creación**: mostrar toast y permitir reintento sin cerrar el modal.
- **Cancelar creación**: volver al listado de recomendaciones sin perder el término/definición ingresados.

## Validación
- Probar flujo completo como invitado: buscar valor → Crear nueva lista → ingresar nombre → confirmar → modal cierra y toast confirma.
- Probar como usuario autenticado: mismo flujo, verificar que la lista aparezca en el dashboard.
- Probar cancelación en cualquier paso intermedio.
- Ejecutar `npm run lint` y `npm run typecheck` después de los cambios.

## Riesgos
- `handleCreateList` actualmente navega al editor; se debe evitar esa navegación en el flujo rápido.
- Si la creación cloud tarda, el modal debe mantener feedback de carga para no permitir doble envío.
