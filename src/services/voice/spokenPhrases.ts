import { VoiceCommandId } from '../../types';

const PASS_ACK_PHRASE = 'Pues vamos con la siguiente';
const STOP_ACK_PHRASE = 'Deteniendo el juego';
const REVEAL_ACK_PREFIX = 'Esperaba que dijieras:';
const CORRECT_FEEDBACK_PHRASE = 'muy bien, sigue asi';
const INCORRECT_FEEDBACK_VERY_CLOSE = 'muy cerca pero no';
const INCORRECT_FEEDBACK_CLOSE = 'cerca';
const INCORRECT_FEEDBACK_SOMEWHAT = 'te fallo un poco';
const INCORRECT_FEEDBACK_FAIL = 'fallaste';

export function buildCommandAcknowledgement(
  command: VoiceCommandId,
  expectedAnswer?: string,
): string | null {
  switch (command) {
    case 'pass':
      return PASS_ACK_PHRASE;
    case 'stop':
      return STOP_ACK_PHRASE;
    case 'reveal':
      return expectedAnswer
        ? `${REVEAL_ACK_PREFIX} ${expectedAnswer}`
        : null;
    default:
      return null;
  }
}

export function buildCorrectFeedbackPhrase(
  _expectedAnswer: string,
  _similarityPercent: number,
  _threshold: number,
): string {
  return CORRECT_FEEDBACK_PHRASE;
}

export function buildIncorrectFeedbackPhrase(
  _expectedAnswer: string,
  similarityPercent: number,
  threshold: number,
): string {
  if (similarityPercent > threshold - 5) {
    return INCORRECT_FEEDBACK_VERY_CLOSE;
  }
  if (similarityPercent > threshold - 20) {
    return INCORRECT_FEEDBACK_CLOSE;
  }
  if (similarityPercent > threshold - 45) {
    return INCORRECT_FEEDBACK_SOMEWHAT;
  }
  return INCORRECT_FEEDBACK_FAIL;
}
