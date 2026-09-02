export const CYCLE_LABELS: Record<number, string> = {
  1: 'NUEVA',
  2: 'VISTA',
  3: 'RECONOCIDA',
  4: 'FRECUENTE',
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
