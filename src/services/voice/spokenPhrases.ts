import { VoiceCommandId, VoiceLanguage } from '../../types';

type PhraseTable = Record<VoiceLanguage, string>;

const DEFAULT_PHRASE_LANGUAGE: VoiceLanguage = 'es';

const PASS_ACK_PHRASES: PhraseTable = {
  es: 'Pues vamos con la siguiente',
  en: "Let's move on to the next one",
  fr: 'Passons au suivant',
  de: 'Gehen wir zur nächsten',
  it: 'Passiamo al prossimo',
  pt: 'Vamos para o próximo',
};

const STOP_ACK_PHRASES: PhraseTable = {
  es: 'Deteniendo el juego',
  en: 'Stopping the game',
  fr: 'Arrêt du jeu',
  de: 'Spiel wird gestoppt',
  it: 'Fermo il gioco',
  pt: 'Parando o jogo',
};

const REVEAL_ACK_PREFIXES: PhraseTable = {
  es: 'Esperaba que dijieras:',
  en: 'I was expecting you to say:',
  fr: "Je m'attendais à ce que tu dises :",
  de: 'Ich hatte gehofft, dass du sagst:',
  it: 'Mi aspettavo che dicessi:',
  pt: 'Eu esperava que você dissesse:',
};

const CORRECT_FEEDBACK_PHRASES: PhraseTable = {
  es: 'muy bien, sigue asi',
  en: 'very good, keep it up',
  fr: 'très bien, continue comme ça',
  de: 'sehr gut, mach weiter so',
  it: 'molto bene, continua così',
  pt: 'muito bem, continue assim',
};

const INCORRECT_FEEDBACK_VERY_CLOSE: PhraseTable = {
  es: 'muy cerca pero no',
  en: 'so close, but not quite',
  fr: 'tout près, mais non',
  de: 'ganz nah dran, aber nein',
  it: 'quasi, ma no',
  pt: 'quase, mas não',
};

const INCORRECT_FEEDBACK_CLOSE: PhraseTable = {
  es: 'cerca',
  en: 'close',
  fr: 'près',
  de: 'nah dran',
  it: 'vicino',
  pt: 'perto',
};

const INCORRECT_FEEDBACK_SOMEWHAT: PhraseTable = {
  es: 'te fallo un poco',
  en: 'a little off',
  fr: 'un peu à côté',
  de: 'ein bisschen daneben',
  it: "un po' fuori",
  pt: 'um pouco fora',
};

const INCORRECT_FEEDBACK_FAIL: PhraseTable = {
  es: 'fallaste',
  en: 'you failed',
  fr: 'raté',
  de: 'leider falsch',
  it: 'hai sbagliato',
  pt: 'você errou',
};

function phraseFor(table: PhraseTable, lang: string | null | undefined): string {
  const key = (lang || DEFAULT_PHRASE_LANGUAGE) as VoiceLanguage;
  return table[key] ?? table[DEFAULT_PHRASE_LANGUAGE];
}

export function buildCommandAcknowledgement(
  command: VoiceCommandId,
  lang?: string | null,
): string | null {
  switch (command) {
    case 'pass':
      return phraseFor(PASS_ACK_PHRASES, lang);
    case 'stop':
      return phraseFor(STOP_ACK_PHRASES, lang);
    default:
      return null;
  }
}

export function getRevealAckPrefix(lang?: string | null): string {
  return phraseFor(REVEAL_ACK_PREFIXES, lang);
}

export function buildCorrectFeedbackPhrase(
  _expectedAnswer: string,
  _similarityPercent: number,
  _threshold: number,
  lang?: string | null,
): string {
  return phraseFor(CORRECT_FEEDBACK_PHRASES, lang);
}

export function buildIncorrectFeedbackPhrase(
  _expectedAnswer: string,
  similarityPercent: number,
  threshold: number,
  lang?: string | null,
): string {
  if (similarityPercent > threshold - 5) {
    return phraseFor(INCORRECT_FEEDBACK_VERY_CLOSE, lang);
  }
  if (similarityPercent > threshold - 20) {
    return phraseFor(INCORRECT_FEEDBACK_CLOSE, lang);
  }
  if (similarityPercent > threshold - 45) {
    return phraseFor(INCORRECT_FEEDBACK_SOMEWHAT, lang);
  }
  return phraseFor(INCORRECT_FEEDBACK_FAIL, lang);
}
