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

export type EffectIntensity = 'sutil' | 'normal' | 'intenso';

export interface EffectOptions {
  duration?: number;
  intensity?: EffectIntensity;
  color?: string;
  message?: string;
  sourcePosition?: { x: number; y: number };
  targetPosition?: { x: number; y: number };
}

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

export const EFFECT_COLORS = {
  success: ['#10b981', '#34d399', '#6ee7b7'],
  gold: ['#fbbf24', '#f59e0b', '#fcd34d'],
  warning: ['#f59e0b', '#d97706', '#fb923c'],
  info: ['#3b82f6', '#60a5fa', '#93c5fd'],
  rainbow: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
} as const;
