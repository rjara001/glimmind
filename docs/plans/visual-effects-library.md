# Plan: Biblioteca de Efectos Visuales

## 1. Objetivo

Crear una biblioteca reutilizable de efectos visuales de "éxito" para la aplicación React + TypeScript + Tailwind, que permita disparar animaciones satisfactorias desde cualquier componente cuando el usuario acierta una respuesta.

## 2. Estructura de archivos

```
src/
  hooks/
    useGameEffect.ts
  effects/
    index.ts
    types.ts
    EffectCohete.tsx
    EffectParticulas.tsx
    EffectPop.tsx
    EffectCheckmark.tsx
    EffectOnda.tsx
    EffectCombo.tsx
    EffectFallo.tsx
    EffectShake.tsx
```

## 3. Tipos compartidos

```tsx
export interface EffectConfig {
  id: string;
  name: string;
  icon: string;
  description: string;
  defaultDuration: number;
  defaultColors: string[];
}

export type EffectType =
  | 'cohete'
  | 'particulas'
  | 'pop'
  | 'checkmark'
  | 'onda'
  | 'combo'
  | 'aprendida'
  | 'fallo'
  | 'shake';

export const EFFECT_CONFIGS: Record<EffectType, EffectConfig> = {
  cohete: {
    id: 'cohete',
    name: 'Cohete',
    icon: '🚀',
    description: 'Un cohete viaja hacia la meta con estela de partículas',
    defaultDuration: 900,
    defaultColors: ['#fbbf24', '#f59e0b', '#fb923c'],
  },
  aprendida: {
    id: 'aprendida',
    name: 'Aprendida',
    icon: '⭐',
    description: 'Combinación especial para items APRENDIDAS',
    defaultDuration: 1200,
    defaultColors: ['#fbbf24', '#f59e0b', '#fcd34d'],
  },
  particulas: {
    id: 'particulas',
    name: 'Partículas',
    icon: '💫',
    description: 'Partículas de colores emergen y vuelan al objetivo',
    defaultDuration: 700,
    defaultColors: ['#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f59e0b'],
  },
  pop: {
    id: 'pop',
    name: 'Pop',
    icon: '🔢',
    description: 'El número crece, rebota y cambia brevemente de color',
    defaultDuration: 500,
    defaultColors: ['#10b981', '#fbbf24'],
  },
  checkmark: {
    id: 'checkmark',
    name: 'Checkmark',
    icon: '✅',
    description: 'Un checkmark aparece con efecto de brillo',
    defaultDuration: 600,
    defaultColors: ['#10b981', '#34d399'],
  },
  onda: {
    id: 'onda',
    name: 'Onda',
    icon: '🌊',
    description: 'Onda expansiva suave desde el centro',
    defaultDuration: 800,
    defaultColors: ['#3b82f6', '#60a5fa'],
  },
  combo: {
    id: 'combo',
    name: 'Combo',
    icon: '🔥',
    description: 'Efecto combinado para rachas de aciertos',
    defaultDuration: 1000,
    defaultColors: ['#ef4444', '#f97316', '#fbbf24'],
  },
  fallo: {
    id: 'fallo',
    name: 'Fallo',
    icon: '❌',
    description: 'Efecto visual para respuestas incorrectas',
    defaultDuration: 600,
    defaultColors: ['#ef4444', '#f87171', '#fca5a5'],
  },
  shake: {
    id: 'shake',
    name: 'Shake',
    icon: '💥',
    description: 'Sacudida breve del elemento para indicar error',
    defaultDuration: 400,
    defaultColors: ['#ef4444', '#f97316'],
  },
};
```

## 4. Hook principal `useGameEffect`

```tsx
export type EffectType =
  | 'cohete'
  | 'particulas'
  | 'pop'
  | 'checkmark'
  | 'onda'
  | 'combo'
  | 'aprendida'
  | 'fallo'
  | 'shake';

export type EffectIntensity = 'sutil' | 'normal' | 'intenso';

export interface EffectOptions {
  duration?: number;
  intensity?: EffectIntensity;
  color?: string;
  message?: string;
  sourcePosition?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
}

interface UseGameEffectProps {
  containerRef: React.RefObject<HTMLElement>;
  targetRef: React.RefObject<HTMLElement>;
  sourceRef?: React.RefObject<HTMLElement>;
  onComplete?: () => void;
}

interface UseGameEffectReturn {
  trigger: (effectType: EffectType, options?: EffectOptions) => void;
  isPlaying: boolean;
}
```

Responsabilidades del hook:
- Orquestar efectos encolados.
- Resolver posiciones origen/destino a partir de refs o coordenadas explicitas.
- Montar efectos con portal/cleanup automático.
- Respetar `prefers-reduced-motion`.
- Limpiar al desmontar.

## 4.1 Sistema de cola de efectos

Cuando el usuario acierta rápido, los efectos se encolan y se ejecutan secuencialmente:

```tsx
const queue: EffectQueueItem[] = [];
let isProcessing = false;

const processQueue = () => {
  if (isProcessing || queue.length === 0) return;
  isProcessing = true;
  const item = queue.shift();
  // Ejecutar efecto...
  // Al terminar: isProcessing = false; processQueue();
};
```

## 4.2 Sistema de intensidad

| Intensidad | Uso |
|------------|-----|
| `sutil` | Aciertos normales, actualizaciones de contador |
| `normal` | Aciertos en ciclos intermedios |
| `intenso` | APRENDIDAS, logros especiales |

La intensidad modifica:
- `duration` (multiplicador: sutil=0.7, normal=1.0, intenso=1.3)
- Cantidad de partículas (sutil=8, normal=14, intenso=22)
- Escala de animaciones

## 4.3 Paleta de colores

```tsx
export const EFFECT_COLORS = {
  success: ['#10b981', '#34d399', '#6ee7b7'],
  gold: ['#fbbf24', '#f59e0b', '#fcd34d'],
  warning: ['#f59e0b', '#d97706', '#fb923c'],
  info: ['#3b82f6', '#60a5fa', '#93c5fd'],
  rainbow: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
};
```

## 5. Efectos

### 5.1 EffectCohete (principal para APRENDIDAS)

Combina:
- Cohete desde origen hasta destino.
- Onda expansiva al llegar.
- Partículas doradas al impacto.
- Pop numérico en el contador.

### 5.2 EffectParticulas

Partículas desde origen hacia target con colores aleatorios.

### 5.3 EffectPop

Número flotante que crece, rebota y se desvanece en el target.

### 5.4 EffectCheckmark

Checkmark con escala y brillo en el target.

### 5.5 EffectOnda

Anillo expansivo desde el target.

### 5.6 EffectCombo

Secuencia combinada: onda + pop múltiple con delays.

### 5.7 EffectFallo

Efecto para respuestas incorrectas:
- Elemento de error (❌) centrado en el target.
- Posible ondas expansivas en rojo.
- Opcional: partículas hacia abajo simulando "caída".

### 5.8 EffectShake

Sacudida breve del elemento:
- Aplica transformación translateX con easing.
- Duración corta (300-400ms).
- Usa colores de warning/error.

## 6. Integración en GameView

```tsx
const countersRef = useRef<HTMLDivElement>(null);
const correctRef = useRef<HTMLSpanElement>(null);
const questionRef = useRef<HTMLDivElement>(null);

const { trigger, isPlaying } = useGameEffect({
  containerRef: countersRef,
  targetRef: correctRef,
  sourceRef: questionRef,
  onComplete: () => {
    actions.handleCorrect();
  },
});
```

Disparos:
- `trigger('aprendida', { message: '🎉 ¡Aprendida!' })` cuando acierta en el primer ciclo.
- `trigger('pop')` para aciertos normales.

## 7. Ejemplo en FinishedScreen

```tsx
const { trigger } = useGameEffect({
  containerRef,
  targetRef: statsRef,
});

useEffect(() => {
  if (summary.totalCorrect > 0) {
    trigger('combo', { duration: 1000 });
  }
}, [summary.totalCorrect, trigger]);
```

## 8. Requisitos técnicos

- React Portal para montar efectos fuera del DOM normal.
- CSS Modules o utilidades Tailwind para animaciones.
- SSR seguro: efectos solo en cliente.
- Cleanup automático de DOM.
- Cola de efectos simultáneos.
- `prefers-reduced-motion` respetado.
- `will-change: transform` para hardware acceleration.
- Máximo 18-30 partículas por efecto.

## 9. Comportamiento esperado

### APRENDIDAS
1. Cohete sale de la tarjeta de pregunta.
2. Viaja en diagonal hacia el contador.
3. Al llegar: onda dorada, partículas doradas, pop en el número.
4. El contador aumenta en 1.

### Acierto normal
1. Pop numérico en el contador o partículas sutiles.

### Fallo
1. Efecto `shake` en la tarjeta de pregunta.
2. O `fallo` con partículas rojas descendentes.
3. Feedback visual rojo en el área de respuesta.

## 10. Entregables

- Biblioteca de efectos en `src/effects`.
- Hook `useGameEffect` en `src/hooks`.
- Integración en `GameView.tsx`.
- Ejemplo en `FinishedScreen.tsx`.
- Documentación de extensión para nuevos efectos.

## 11. Próximos pasos

1. Crear archivos de la biblioteca.
2. Implementar `EffectCohete` completo.
3. Implementar `EffectFallo` y `EffectShake`.
4. Implementar efectos restantes siguiendo el mismo patrón.
5. Integrar en `GameView.tsx` (aciertos y fallos).
6. Probar accesibilidad y rendimiento.
7. Revisar estilos con Tailwind.
