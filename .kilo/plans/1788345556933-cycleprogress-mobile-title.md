# Plan: Título "Progreso por ciclo" en layout mobile

## Contexto

En el layout mobile horizontal (`isMobile` en `CycleProgress.tsx`), la barra tipo trencito muestra 4 bolsas (NUEVA/VISTA/RECONOCIDA/FRECUENTE) con flechas entre ellas y el badge "Aprendidas" al final. Sin contexto, el usuario ve números y colores sin saber qué representan.

El panel expandido ya tiene explicación ("⬇ Acierto 1er ciclo → APRENDIDAS", etc.) y el sidebar vertical de desktop tiene su propio contexto visual, por lo que el cambio aplica **solo al estado colapsado del layout mobile**.

## Objetivo

Añadir un título breve encima del trencito en el layout mobile que indique el propósito de la barra.

## Cambios

### 1. `src/components/game/CycleProgress.tsx`

En el bloque `if (isMobile) { return (...) }`, insertar un encabezado inmediatamente antes del `<div className="bg-[#fafcff] rounded-[14px] ... flex items-center justify-between gap-1.5">` (la fila del trencito).

Encabezado propuesto:

```tsx
<div className="flex items-center gap-1.5 px-1 mb-1">
  <span className="text-[0.7rem] font-semibold text-[#4a617a]">
    📊 Progreso por ciclo
  </span>
</div>
```

Notas:
- `text-[0.7rem]` y `text-[#4a617a]` coinciden con tipografías/colores ya usados en el panel expandido (`Progreso total`, footer), para mantener consistencia.
- `mb-1` deja aire con el trencito.
- `px-1` alinea con el padding visual del trencito.
- Emoji 📊 refuerza la semántica de "progreso" (similar a `📊 Progreso real` ya usado en el panel expandido).

### 2. Sin cambios en desktop

La rama de `return` de desktop (sidebar vertical) no se toca. El sidebar ya tiene su propio contexto visual.

### 3. Sin cambios en tests existentes

Los tests actuales de `CycleProgress.test.tsx` no assertan sobre la ausencia del título en mobile, por lo que siguen pasando sin modificación. Si se desea, se puede agregar un test opcional que verifique la presencia del texto "Progreso por ciclo" en `isMobile={true}` y su ausencia en `isMobile={false}`. **Marcado como opcional** (no incluido en este plan).

### 4. Version bump (al commit)

- `src/constants/version.ts` → `APP_VERSION = '1.19.8'`
- `package.json` → `"version": "1.19.8"`

## Riesgos

- Cambio puramente cosmético y aislado al bloque mobile. No afecta desktop, no afecta lógica de juego, no afecta eventos.
- Verificar que el padding no rompa el alineamiento con el `max-w-[480px] mx-auto` del contenedor mobile.

## Validación

- `npx vitest run tests/components/game/CycleProgress.test.tsx` → debe seguir 3/3.
- Inspección visual en mobile portrait y landscape con DevTools para confirmar alineación y legibilidad.
- Confirmar que el desktop (sidebar vertical) no muestra el título nuevo.
