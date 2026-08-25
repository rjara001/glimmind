# Practice Mode Music Player Controls Plan

## Goal

En modo práctica (training), reemplazar la botonera de juego (`GameControls`) por una botonera de
reproductor estilo "música" (Play / Pause / Stop) que presenta la tarjeta automáticamente:

1. **Play** → activa el mecanismo de auto-next: muestra el término (Valor1) → espera N segundos →
   revela la definición (Valor2) → espera M segundos → avanza a la siguiente tarjeta (auto-pass).
2. **Pause** → desactiva el reloj de auto-next (pausa el temporizador, queda en la tarjeta actual).
3. **Stop** → detiene el juego por completo y vuelve al dashboard.

La voz (TTS) se controla con un botón externo (el toggle existente de voz en el `GameHeader`), **no**
se acopla a esta botonera.

El componente de botonera debe ser **agnístico** — no importa del motor de juego (`gameEngine`,
`useGameLogic`); recibe callbacks y estado por props.

## Estado actual del código

- **Modos de juego**: `'training'` (práctica) y `'real'` — `src/types.ts:2`
- **GameControls** (`src/components/game/GameControls.tsx`): muestra "Pasar", "Revelar", "Correcta"
  en training; "Validar", "Pasar", "Revelar" en real. Recibe callbacks tight-coupled
  (`actions.handlePass`, `actions.reveal`, etc.) directamente desde `GameView`.
- **GameView** (`src/components/views/GameView.tsx:560-570`): condiciona entre
  `VoiceControls` (`isVoiceMode`) y `GameControls`. El toggle de voz está en el `GameHeader`
  (`src/components/game/GameHeader.tsx`).
- **useGameLogic** (`src/hooks/game/useGameLogic.ts`): ya tiene `autoRevealTimerRef` y
  `autoAdvanceTimerRef` + `actions.reveal()` / `actions.handlePass()` / `actions.handleCorrect()`.
- **CountdownTimer** (`src/components/layout/CountdownTimer.tsx`): display circular de cuenta
  regresiva, ya usado en `GameView:525` para el auto-next de voz (5 s).
- **Constantes** (`src/constants/app.ts`): `REVEAL_AUTO_NEXT_SECONDS = 5`.
- **Lista settings** (`src/types.ts:42-62`): incluye `autoRevealAfterSeconds?` (default 15, usado
  para auto-reveal tras respuesta incorrecta), `autoAdvanceAfterAttempts?` (default 3).
- **SettingsModal** (`src/components/modals/SettingsModal.tsx`): toggle de modo juego, hints,
  voice, etc. No expone `autoRevealAfterSeconds` todavía.

## Cambios propuestos

### 1. Nuevas constantes (`src/constants/app.ts`)

- `PRACTICE_REVEAL_DELAY_SECONDS = 5` — delay N antes de revelar la definición.
- `PRACTICE_AUTO_ADVANCE_SECONDS = REVEAL_AUTO_NEXT_SECONDS` — delay M antes de auto-advancar
  (reutiliza el valor existente de 5 s).

### 2. Nuevo tipo: `PlayerStatus` (`src/types/player-controls.ts`)

```ts
export type PlayerStatus = 'idle' | 'playing' | 'paused';
```

### 3. Nuevo hook: `usePracticePlayer` (`src/hooks/game/usePracticePlayer.ts`)

Hook agnístico que encapsula la lógica de temporizadores. No importa del motor de juego ni de
componentes. Recibe callbacks `onReveal` y `onAdvance` por parámetro.

**Responsabilidades:**
- `start()` — inicia el ciclo: timer de reveal (N s) → `onReveal()` → timer de advance (M s) →
  `onAdvance()` → repite si sigue en playing.
- `pause()` — detiene el timer activo.
- `resume()` — reanuda el timer (continúa la fase actual: reveal o advance).
- `stop()` — limpia todo, status → `idle`.
- Cleanup: `useEffect` con retorno de cleanup (cancela timers al desmontar).
- Expone: `status`, `phase` (`'waiting' | 'revealing' | 'advancing'`), `remainingSeconds`,
  `revealSeconds`, `advanceSeconds`, `start`, `pause`, `resume`, `stop`.

**Props de entrada:**
```ts
interface UsePracticePlayerParams {
  revealSeconds?: number;   // N
  advanceSeconds?: number;  // M
  onReveal: () => void;     // call actions.reveal()
  onAdvance: () => void;    // call actions.handlePass()
  onStop?: () => void;      // navigate to dashboard
  isGameFinished?: boolean; // stop auto-next when finished
}
```

### 4. Nuevo componente: `PracticeModeControls` (`src/components/game/PracticeModeControls.tsx`)

Componente **agnístico** — no importa de `gameEngine`, `useGameLogic`, `types` del juego, etc.

**Props:**
```ts
interface PracticeModeControlsProps {
  status: PlayerStatus;
  phase: 'waiting' | 'revealing' | 'advancing';
  remainingSeconds: number;
  revealSeconds: number;
  advanceSeconds: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
}
```

**Render:**
- Contenedor estilo barra de reproductor (similar a `VoiceControls` layout).
- **Play** (▶): visible cuando `status === 'idle'` o `status === 'paused'`. Click → `onPlay`.
- **Pause** (⏸): visible cuando `status === 'playing'`. Click → `onPause`.
- **Stop** (⏹): siempre visible. Click → `onStop`.
- **Display de cuenta regresiva**: muestra `remainingSeconds` en la fase activa, con label
  `"Revelando en..."` (fase waiting) / `"Siguiente en..."` (fase advancing).

### 5. Integración en `GameView.tsx`

- Importar `usePracticePlayer` y `PracticeModeControls`.
- Añadir estado `isPracticePlayer` (boolean, init `false`).
- Instanciar el hook:
  ```tsx
  const practicePlayer = usePracticePlayer({
    revealSeconds: list.settings.practiceRevealDelay ?? PRACTICE_REVEAL_DELAY_SECONDS,
    advanceSeconds: PRACTICE_AUTO_ADVANCE_SECONDS,
    onReveal: actions.reveal,
    onAdvance: actions.handlePass,
    onStop: () => navigate('dashboard'),
    isGameFinished: gameState.isFinished,
  });
  ```
- Añadir toggle en `GameHeader`: botón "Presentación" (igual que el toggle de voz) que setea
  `isPracticePlayer` (solo visible en modo training).
- Reemplazar la sección de controles:
  ```tsx
  {isPracticePlayer && list.settings.mode === 'training' ? (
    <PracticeModeControls
      status={practicePlayer.status}
      phase={practicePlayer.phase}
      remainingSeconds={practicePlayer.remainingSeconds}
      revealSeconds={practicePlayer.revealSeconds}
      advanceSeconds={practicePlayer.advanceSeconds}
      onPlay={practicePlayer.start}
      onPause={practicePlayer.pause}
      onStop={practicePlayer.stop}
    />
  ) : isVoiceMode ? (
    <VoiceControls .../>
  ) : (
    <GameControls .../>
  )}
  ```
- `Stop` del player: setear `isPracticePlayer = false` y navegar al dashboard.
- El toggle de voz sigue funcionando independientemente.

### 6. Lista setting: `practiceRevealDelay` (`src/types.ts`)

Añadir a `AssociationList.settings`:
```ts
practiceRevealDelay?: number;
```
- Default: `PRACTICE_REVEAL_DELAY_SECONDS` (5 s).
- Opcional: exponer en `SettingsModal` como un slider (similar a `RangeSliderField` del umbral).

### 7. Settings: toggle en el dashboard?

El usuario dijo "en modo práctica" — el toggle aparece solo cuando
`list.settings.mode === 'training'`. En modo real, los controles normales se mantienen.

## Archivos a crear

| Archivo | Propósito |
|---|---|
| `src/types/player-controls.ts` | Tipo `PlayerStatus` |
| `src/hooks/game/usePracticePlayer.ts` | Hook de timer agnístico |
| `src/components/game/PracticeModeControls.tsx` | Componente de botonera agnóstica |

## Archivos a modificar

| Archivo | Cambios |
|---|---|
| `src/constants/app.ts` | Añadir `PRACTICE_REVEAL_DELAY_SECONDS` |
| `src/types.ts` | Añadir `practiceRevealDelay?: number` a settings |
| `src/components/game/GameHeader.tsx` | Añadir toggle de presentación + prop `onPracticeToggle` |
| `src/components/views/GameView.tsx` | Integrar hook, estado, render condicional |
| `src/hooks/app/useAppActions.ts` | **No cambia** (el stop navega vía `onBack`/`navigate`) |
| `src/App.tsx` | Pasar `onBack` (ya existe) — el Stop llama a `onBack()` |

## Flujo de usuario

```
[Usuario en GameView, modo training]
  ↓
  Presiona toggle "Presentación" en GameHeader
  ↓
  Aparece PracticeModeControls (Play / Stop)
  GameControls desaparece
  La tarjeta muestra Valor1 (término) con definición oculta
  ↓
  Presiona Play
  ├─ Término está visible (Valor1)
  ├─ Timer cuenta N segundos → "Revelando en 5...4...3..."
  ├─ Se revela Valor2 (definición) — actions.reveal()
  ├─ Timer cuenta M segundos → "Siguiente en 5...4...3..."
  ├─ Auto-next — actions.handlePass() → nueva tarjeta
  ├─ Si sigue en Play: repite ciclo
  └─ Si juego termina: muestra FinishedScreen
  ↓
  Presiona Pause en cualquier momento → detiene el timer
  Presiona Play de nuevo → reanuda
  Presiona Stop → vuelve al dashboard
```

## Consideraciones técnicas

1. **Cleanup de timers**: El hook debe limpiar timers en `useEffect` cleanup y al desmontar,
   previniendo memory leaks y llamadas a componentes desmontados.
2. **Re-reveal de tarjetas**: Si el usuario pausa y reanuda después de reveal, el auto-advance
   debe continuar. El hook gestiona el estado de fase (`'waiting' | 'revealing' | 'advancing'`)
   para saber en qué punto del ciclo está.
3. **Sync con estado del juego**: El hook debe observar `isGameFinished` y `currentAssociation?.id`
   — si la tarjeta cambió o el juego terminó, debe resetear su estado.
4. **Voice desacoplado**: El toggle de voz (`/GameHeader:39-58`) sigue funcionando. En modo
   presentación, el usuario puede activar voz para que se lea el término (Valor1) en voz, sin que
   eso interfiera con el temporizador.
5. **CardInput**: En modo presentación, el input de texto (`CardContent`) puede quedar. Esto no
   rompe funcionalidad (el usuario no escribe). Se puede considerar pasar una prop
   `hideInput` a `GameCard`/`CardContent` en un follow-up si se desea ocultarlo.
