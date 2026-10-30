import type { StateKey } from '../types/progress';

import i18n from '../i18n';

export function getCycleLabel(cycle: number): string {
  switch (cycle) {
    case 1:
      return i18n.t('game:cycle_nueva', 'NUEVA');
    case 2:
      return i18n.t('game:cycle_vista', 'VISTA');
    case 3:
      return i18n.t('game:cycle_reconocida', 'RECONOCIDA');
    case 4:
      return i18n.t('game:cycle_frecuente', 'FRECUENTE');
    default:
      return i18n.t('game:cycle_nueva', 'NUEVA');
  }
}

export function getLearnedLabel(): string {
  return i18n.t('game:cycle_aprendida', 'APRENDIDAS');
}

export const CYCLE_LABELS: Record<number, string> = new Proxy({}, {
  get: (_target, prop) => getCycleLabel(Number(prop))
});

export const LEARNED_LABEL = 'APRENDIDAS';

export const STATE_LABELS: Record<StateKey, string> = {
  nuevas: 'NUEVA',
  vistas: 'VISTA',
  reconocidas: 'RECONOCIDA',
  frecuentes: 'FRECUENTE',
  aprendidas: 'APRENDIDAS',
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
