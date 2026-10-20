import type { GameCycle } from '../types';
import { CYCLE_LABELS } from './cycle-colors';

export const CYCLE_RULE_CHIPS: readonly string[] = [
  '⬇ Correcto en ciclo 1 → APRENDIDAS',
  '✅ Correcto en ciclo 2 o más → se queda',
  '➡ Siguiente → pasa de ciclo',
];

export function correctOutcomeLabel(activeCycle: GameCycle): string {
  if (activeCycle === 1) {
    return `${CYCLE_LABELS[1]}: correcto → APRENDIDAS`;
  }
  return `${CYCLE_LABELS[activeCycle]}: correcto → se queda`;
}

export function nextOutcomeLabel(activeCycle: GameCycle): string {
  if (activeCycle >= 4) {
    return 'Siguiente → permanece';
  }
  return `Siguiente → ${CYCLE_LABELS[activeCycle + 1]}`;
}
