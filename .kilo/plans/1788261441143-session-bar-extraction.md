# Plan: Extraer SessionBar como componente separado

## Obajo
Extraer la barra de sesión (Meta, Sesión, Modo Real, Voz, Reiniciar, Configuración, etc.) del componente `GameHeader` a un nuevo componente `SessionBar`. El layout visual se mantiene igual.

## Estructura actual

```
GameHeader (GameHeader.tsx)
├── [←] Botón atrás
├── Título (listName + Queue x/y + Cycle 4)
└── Barra de sesión ← EXTRAR
    ├── Meta progress
    ├── Sesión count
    ├── Modo Real/Práctica badge
    ├── Voz toggle
    ├── Grabar Voz (premium)
    ├── Historial (premium)
    ├── AutoPlay (practice mode)
    ├── Reiniciar
    └── Configuración
```

## Estructura propuesta

```
GameHeader (GameHeader.tsx) - modificado
├── [←] Botón atrás
└── Título (listName + Queue x/y + Cycle 4)

SessionBar (SessionBar.tsx) - NUEVO
├── Meta progress
├── Sesión count
├── Modo Real/Práctica badge
├── Voz toggle
├── Grabar Voz (premium)
├── Historial (premium)
├── AutoPlay (practice mode)
├── Reiniciar
└── Configuración
```

## Archivos afectados

1. **CREAR**: `src/components/game/SessionBar.tsx`
2. **CREAR**: `src/types/session-bar-props.ts` (interfaz de props)
3. **MODIFICAR**: `src/components/game/GameHeader.tsx` - remover sesión bar
4. **MODIFICAR**: `src/types/game-header-props.ts` - remover props de sesión
5. **MODIFICAR**: `src/components/views/GameView.tsx` - importar y renderizar SessionBar

## Tasks

### 1. Crear interfaz `SessionBarProps`

Archivo: `src/types/session-bar-props.ts`

Props necesarias (extraídas de `GameHeaderProps`):
```typescript
export interface SessionBarProps {
  gameMode: 'training' | 'real';
  goalProgress?: number;
  goalTarget?: number;
  sessionRepasos?: number;
  onSettingsClick: () => void;
  onRestart?: () => void;
  voiceEnabled?: boolean;
  onVoiceToggle?: () => void;
  isPremium?: boolean;
  isRecording?: boolean;
  onRecordToggle?: () => void;
  onViewRecordings?: () => void;
  isPresentationActive?: boolean;
  onPracticeToggle?: () => void;
}
```

### 2. Crear componente `SessionBar`

Archivo: `src/components/game/SessionBar.tsx`

Mover el contenido del `<div className="flex items-center gap-2">` (líneas 24-131 de GameHeader.tsx) al nuevo componente.

Incluye:
- Meta progress display (goalProgress/goalTarget)
- Sesión repasos counter
- Modo Real/Práctica badge
- Botón Voz toggle
- Botón Grabar Voz (condicional: `isPremium && onRecordToggle`)
- Botón Historial (condicional: `isPremium && onViewRecordings`)
- Botón AutoPlay (condicional: `isPresentationActive !== undefined && onPracticeToggle && gameMode === 'training'`)
- Botón Reiniciar (condicional: `onRestart`)
- Botón Configuración

### 3. Modificar `GameHeader`

Archivo: `src/components/game/GameHeader.tsx`

- Remover props de sesión de la interfaz `GameHeaderProps`
- Remover el `<div className="flex items-center gap-2">` con todos los controles
- Mantener solo: back button, listName, queue info, cycle4Count
- Actualizar interfaz en `src/types/game-header-props.ts`

### 4. Modificar `GameView`

Archivo: `src/components/views/GameView.tsx`

- Importar `SessionBar`
- Renderizar `<SessionBar />` dentro del mismo flex container que `<GameHeader />`
- Mantener layout con `justify-between` para título izquierda, sesión derecha

Layout resultante:
```jsx
<div className="flex flex-wrap items-center justify-between gap-4 mb-4 px-2">
  <GameHeader ... />
  <SessionBar ... />
</div>
```

## Notas de implementación

El JSX exacto a mover está en `GameHeader.tsx` líneas 24-131:
```jsx
<div className="flex items-center gap-2">
  {/* Meta + Sesión */}
  <div className="hidden lg:flex items-center gap-3 ...">...</div>
  {/* Modo badge */}
  <div className="flex bg-slate-100/50 p-1 rounded-xl...">...</div>
  {/* Voz toggle */}
  {onVoiceToggle && (<button>...</button>)}
  {/* Grabar Voz */}
  {isPremium && onRecordToggle && (<button>...</button>)}
  {/* Historial */}
  {isPremium && onViewRecordings && (<button>...</button>)}
  {/* AutoPlay */}
  {isPresentationActive !== undefined && onPracticeToggle && gameMode === 'training' && (<button>...</button>)}
  {/* Reiniciar */}
  {onRestart && (<button>...</button>)}
  {/* Configuración */}
  <button onClick={onSettingsClick}>...</button>
</div>
```

## Validación

- `npx tsc --noEmit` sin errores
- `npm run build` exitoso
- Layout visual idéntico en http://localhost:3001/
- Todos los botones funcionales: Voz, Reiniciar, Configuración, Grabar (premium), AutoPlay (practice)
