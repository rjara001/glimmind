# Plan: Actualizar Estadísticas del Dashboard para Incluir Archivados

## Contexto

El Dashboard muestra "Tu Progreso" con estadísticas de palabras aprendidas. Actualmente excluye items archivados del total, lo que impide ver el progreso real del usuario.

El usuario quiere:
- **Total Palabras**: TODOS los items (archivados + no archivados)
- **Aprendidas**: items archivados (que representan lo aprendido)
- **Por Aprender**: items no archivados (activos)
- **Completado**: porcentaje real de progreso (Aprendidas / Total)

## Cambio Requerido

### Archivo: `src/components/views/Dashboard.tsx`

**Función:** `stats` (línea 59-72)

**Código actual:**
```typescript
const stats = useMemo(() => {
  let totalWords = 0;
  let totalLearned = 0;
  lists.forEach(list => {
    const activeAssociations = (list.associations || []).filter((a: any) => !a.isArchived);
    totalWords += activeAssociations.length;
    totalLearned += activeAssociations.filter((a: any) => a.isLearned || a.status === 'correct').length;
  });
  return {
    totalWords,
    totalLearned,
    percentage: totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0
  };
}, [lists]);
```

**Código nuevo:**
```typescript
const stats = useMemo(() => {
  let totalWords = 0;
  let totalLearned = 0;
  lists.forEach(list => {
    const allAssociations = list.associations || [];
    totalWords += allAssociations.length;
    totalLearned += allAssociations.filter((a: any) => a.isArchived).length;
  });
  return {
    totalWords,
    totalLearned,
    remaining: totalWords - totalLearned,
    percentage: totalWords > 0 ? Math.round((totalLearned / totalWords) * 100) : 0
  };
}, [lists]);
```

### Lógica de cálculo:
- `totalWords` = todas las asociaciones (sin filtrar)
- `totalLearned` = asociaciones con `isArchived === true`
- `remaining` = `totalWords - totalLearned` (para mostrar "Por Aprender")
- `percentage` = `(totalLearned / totalWords) * 100`

## Archivos Afectados

Solo `Dashboard.tsx`. No se requiere cambiar otros archivos.

## Validación

1. Crear una lista con items
2. Jugar y archivar algunos items
3. Verificar Dashboard:
   - Total Palabras = cantidad original
   - Aprendidas = items archivados
   - Por Apnder = items restantes
   - Completado = porcentaje correcto

## Notas

- Los filtros en `gameEngine.ts` (cola de juego) y otras vistas **no cambian**
- Los items archivados siguen sin aparecer en el juego
- Solo se modifica cómo se calculan las estadísticas del Dashboard
