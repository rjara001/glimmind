import type { StateKey } from '../types/progress';

export const CYCLE_LABELS: Record<number, string> = {
  1: 'NUEVA',
  2: 'VISTA',
  3: 'RECONOCIDA',
  4: 'FRECUENTE',
};

export const LEARNED_LABEL = 'APRENDIDAS';

/**
 * Single source of truth for the five state names. The four cycle labels come
 * straight from CYCLE_LABELS so a screen can never rename one of them alone.
 */
export const STATE_LABELS: Record<StateKey, string> = {
  nuevas: CYCLE_LABELS[1],
  vistas: CYCLE_LABELS[2],
  reconocidas: CYCLE_LABELS[3],
  frecuentes: CYCLE_LABELS[4],
  aprendidas: LEARNED_LABEL,
};

export interface CycleColorPalette {
  bg: string;
  border: string;
  text: string;
}

export const CYCLE_COLORS: Record<string, CycleColorPalette> = {
  nueva: { bg: '#f0f4fe', border: '#c7d9f0', text: '#1a2b3c' },
  vista: { bg: '#fef7e6', border: '#f0e0b8', text: '#1a2b3c' },
  reconocida: { bg: '#fce8e8', border: '#f0c8c8', text: '#1a2b3c' },
  frecuente: { bg: '#f0eaf8', border: '#d8cce8', text: '#1a2b3c' },
};

export type CycleColorKey = keyof typeof CYCLE_COLORS;

export function cycleToColorKey(cycle: number): CycleColorKey {
  switch (cycle) {
    case 1:
      return 'nueva';
    case 2:
      return 'vista';
    case 3:
      return 'reconocida';
    default:
      return 'frecuente';
  }
}
