# Plan: CycleProgress Sidebar — Mobile Bottom + Landscape Compact

## Contexto

El sidebar vertical de `CycleProgress` (4 cajas apiladas: NUEVA/VISTA/RECONOCIDA/FRECUENTE) es la "barra vertical de progreso". En `GameView.tsx:579`, el layout `flex flex-col lg:flex-row` ya coloca CycleProgress abajo en mobile (< 1024px). Sin embargo, **no hay detección de orientación**: en landscape, el sidebar ocupa demasiado alto (el viewport es más estrecho verticalmente).

## Requisitos

1. **Mobile portrait**: Barra vertical en la parte inferior (ya funciona, verificar).
2. **Mobile landscape**: Barra vertical también en la parte inferior, pero **más pequeña/compacta** para aprovechar el espacio horizontal limitado.
3. **Desktop**: Sin cambios (sidebar a la derecha).

## Cambios

### 1. Hook `useOrientation` (nuevo)
**Archivo**: `src/hooks/ui/useOrientation.ts`

Usa `useMediaQuery` (existe en `src/hooks/ui/useMediaQuery.ts`) para detectar orientación y tamaño de móvil.

```typescript
export function useOrientation() {
  const isPortrait = useMediaQuery('(orientation: portrait)');
  const isLandscape = useMediaQuery('(orientation: landscape)');
  const isMobile = useMediaQuery('(max-width: 1023px)'); // coincide con breakpoint lg de Tailwind
  return { isPortrait, isLandscape, isMobile };
}
```

### 2. Tipos: `CycleProgressProps` (nuevo archivo, refactorizar)
**Archivo**: `src/types/cycle-progress-props.ts` (seguir la convención de `game-header-props.ts`, `session-bar-props.ts`)

```typescript
import { GameState } from './';

export interface CycleProgressProps {
  gameState: GameState;
  cycleColorName?: string;
  isMobile?: boolean;
  isLandscape?: boolean;
}
```

### 3. `CycleProgress.tsx` — estilos compactos en landscape
**Archivo**: `src/components/game/CycleProgress.tsx`

- Importar `CycleProgressProps` desde `types/cycle-progress-props.ts` (eliminar la interfaz inline).
- Cuando `isMobile && isLandscape`, aplicar clases compactas al sidebar:
  - Cajas: `py-1 px-1.5` en vez de `py-2 px-2.5`, font `text-[0.4rem]` en vez de `text-[0.55rem]`.
  - Contador: `text-lg` en vez de `text-xl`.
  - `min-w-[55px]` en vez de `min-w-[70px]` para las cajas.
  - Badge total: `px-2.5 py-0.5` en vez de `px-3.5 py-1`.
  - `min-h-[240px]` en vez de `min-h-[320px]` (altura del contenedor principal).
- El panel expandido ya comienza colapsado (`isExpanded = false`), no cambiar.

### 4. `GameView.tsx` — pasar props de orientación
**Archivo**: `src/components/views/GameView.tsx`

- Importar `useOrientation`.
- Declarar `const { isMobile, isLandscape } = useOrientation();` dentro del componente.
- Pasar a `<CycleProgress>`:
  ```tsx
  <CycleProgress
    gameState={gameState}
    cycleColorName={cycleColorName}
    isMobile={isMobile}
    isLandscape={isLandscape}
  />
  ```
- El layout `flex flex-col lg:flex-row` ya posiciona CycleProgress abajo en mobile. No requiere cambios de estructura.

### 5. Tests
**Archivo**: `tests/components/game/CycleProgress.test.tsx` (nuevo)

- Renderizar CycleProgress con `isMobile={true}` e `isLandscape={true}` y verificar que las cajas usan estilos compactos (clases más pequeñas presentes).
- Renderizar con `isMobile={false}` y verificar que no aplica estilos compactos.

### 6. Version bump (al commit)
- `src/constants/version.ts` → `APP_VERSION = '1.19.5'`
- `package.json` → `"version": "1.19.5"`

## Riesgos

- La CDN de Tailwind no soporta variantes compuestas (`sm:portrait:`); usar `useMediaQuery` evita este problema.
- Cambios deben afectar solo mobile + landscape, no desktop.
- El sidebar ya está colapsado por defecto en mobile; verificar que el botón de expandir sigue funcionando.

## Validación

- `npx vitest run tests/components/game/CycleProgress.test.tsx` (nuevo test).
- `npx vitest run` (no romper tests existentes).
- `npx tsc --noEmit` (type check).
- Inspección visual simulando mobile portrait y landscape.
