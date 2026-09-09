# Plan: Restaurar límite máximo de tarjetas por mazo

## Problema actual

- `MAX_CARDS_PER_DECK` fue eliminado de `src/constants/limits.ts` en el commit `bb6725a` (centralización de quotas, 30 ago 2026).
- Ese commit movió los límites a `src/constants/quotaConfig.ts` y `src/services/quotaService.ts`, pero se olvidó de migrar o preservar `MAX_CARDS_PER_DECK`.
- Quedaron imports rotos en:
  - `src/utils/splitAssociations.ts` (usa `MAX_CARDS_PER_DECK` como default)
  - `src/hooks/dashboard/useAssociationManipulation.ts` (importa la constante pero no la usa)
- `docs/issues/2026-09-04-auto-split-deck-feature.md` documenta el límite en 150 como comportamiento esperado.
- No existe implementación de `maxCardsPerDeck` en `UserSettings` a pesar de que el mismo issue lo menciona.

## Historial

| Commit | Fecha | Cambio |
|--------|-------|--------|
| `bb6725a` | 30 ago 2026 | Centralizó quotas, eliminó `MAX_CARDS_PER_DECK` de `limits.ts` |
| Sin commit posterior | — | No se migró la constante a `quotaConfig.ts` ni se actualizaron los imports |

No hay evidencia de que alguien pidiera explícitamente eliminar este límite. Fue un efecto colateral.

## Estado objetivo

1. Tener una única fuente de verdad para límites de mazo (`quotaConfig.ts` o `limits.ts`).
2. Que `splitAssociationsByMax` use ese valor sin import roto.
3. Que el editor respete el límite al dividir mazos grandes.
4. Evaluar si el límite debe ser configurable por usuario (`UserSettings.maxCardsPerDeck`).

## Propuesta

### Opción A: Mínima (recomendada ahora)

Restaurar `MAX_CARDS_PER_DECK = 150` en `src/constants/limits.ts` para desbloquear el código existente.

- `splitAssociations.ts` ya lo importa y lo usa como default.
- `useAssociationManipulation.ts` tiene el import pero no lo usa; se puede dejar así o limpiar después.
- No requiere cambios en backend ni en `UserSettings`.

### Opción B: Configurable por usuario

Mover `MAX_CARDS_PER_DECK` a `src/types/settings.ts` como `maxCardsPerDeck: number` y exponerlo en `DEFAULT_SETTINGS`.

- Requiere actualizar `splitAssociations.ts` para recibir el valor desde el hook o store.
- Requiere UI en SettingsView para editar el valor.
- Más trabajo, pero cumple con lo documentado en `docs/issues/2026-09-04-auto-split-deck-feature.md`.

## Pasos sugeridos (Opción A)

1. Confirmar que `MAX_CARDS_PER_DECK = 150` está exportado desde `src/constants/limits.ts`.
2. Verificar que `src/utils/splitAssociations.ts` compile correctamente.
3. Decidir si `useAssociationManipulation.ts` debe seguir importando la constante o si se elimina el import.
4. Correr build y tests.
5. Documentar en `docs/issues/2026-09-04-auto-split-deck-feature.md` que el límite actual es 150 y quién lo define.

## Preguntas abiertas

1. ¿Debe `MAX_CARDS_PER_DECK` ser configurable por usuario? (Issue 2026-09-04 sugiere que sí)
2. ¿El backend también debe respetar este límite o solo el frontend?
3. ¿Qué pasa con mazos existentes que superen 100 tarjetas? ¿Se dividen automáticamente o se respetan?

## Dueño

Rodrigo Jara
