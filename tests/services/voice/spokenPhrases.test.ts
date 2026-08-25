import { describe, it, expect } from 'vitest';
import {
  buildCommandAcknowledgement,
  getRevealAckPrefix,
  buildCorrectFeedbackPhrase,
  buildIncorrectFeedbackPhrase,
} from '@/services/voice/spokenPhrases';

describe('buildCommandAcknowledgement', () => {
  it('returns the pass acknowledgement phrase in Spanish by default', () => {
    expect(buildCommandAcknowledgement('pass')).toBe('Pues vamos con la siguiente');
  });

  it('returns the stop acknowledgement phrase in Spanish by default', () => {
    expect(buildCommandAcknowledgement('stop')).toBe('Deteniendo el juego');
  });

  it('translates the pass acknowledgement phrase', () => {
    expect(buildCommandAcknowledgement('pass', 'en')).toBe("Let's move on to the next one");
    expect(buildCommandAcknowledgement('pass', 'fr')).toBe('Passons au suivant');
    expect(buildCommandAcknowledgement('pass', 'de')).toBe('Gehen wir zur nächsten');
    expect(buildCommandAcknowledgement('pass', 'it')).toBe('Passiamo al prossimo');
    expect(buildCommandAcknowledgement('pass', 'pt')).toBe('Vamos para o próximo');
  });

  it('translates the stop acknowledgement phrase', () => {
    expect(buildCommandAcknowledgement('stop', 'en')).toBe('Stopping the game');
  });

  it('falls back to Spanish for unknown or missing languages', () => {
    expect(buildCommandAcknowledgement('stop', 'xx')).toBe('Deteniendo el juego');
    expect(buildCommandAcknowledgement('stop', null)).toBe('Deteniendo el juego');
    expect(buildCommandAcknowledgement('stop', undefined)).toBe('Deteniendo el juego');
  });

  it('returns null for commands without an acknowledgement phrase', () => {
    expect(buildCommandAcknowledgement('continue')).toBeNull();
    expect(buildCommandAcknowledgement('reveal', 'en')).toBeNull();
  });
});

describe('getRevealAckPrefix', () => {
  it('returns the reveal prefix in Spanish by default', () => {
    expect(getRevealAckPrefix()).toBe('Esperaba que dijieras:');
  });

  it('translates the reveal prefix', () => {
    expect(getRevealAckPrefix('en')).toBe('I was expecting you to say:');
    expect(getRevealAckPrefix('fr')).toBe("Je m'attendais à ce que tu dises :");
    expect(getRevealAckPrefix('de')).toBe('Ich hatte gehofft, dass du sagst:');
    expect(getRevealAckPrefix('it')).toBe('Mi aspettavo che dicessi:');
    expect(getRevealAckPrefix('pt')).toBe('Eu esperava que você dissesse:');
  });
});

describe('buildCorrectFeedbackPhrase', () => {
  it('returns the short correct feedback phrase in Spanish by default', () => {
    expect(buildCorrectFeedbackPhrase('correr', 100, 95)).toBe('muy bien, sigue asi');
  });

  it('translates the correct feedback phrase', () => {
    expect(buildCorrectFeedbackPhrase('correr', 100, 95, 'en')).toBe('very good, keep it up');
    expect(buildCorrectFeedbackPhrase('to run', 100, 95, 'es')).toBe('muy bien, sigue asi');
  });
});

describe('buildIncorrectFeedbackPhrase', () => {
  it('returns very close when similarity is just below threshold', () => {
    expect(buildIncorrectFeedbackPhrase('correr', 92, 95)).toBe('muy cerca pero no');
  });

  it('returns close when similarity is somewhat below threshold', () => {
    expect(buildIncorrectFeedbackPhrase('correr', 80, 95)).toBe('cerca');
  });

  it('returns somewhat when similarity is further below threshold', () => {
    expect(buildIncorrectFeedbackPhrase('correr', 60, 95)).toBe('te fallo un poco');
  });

  it('returns fail when similarity is very low', () => {
    expect(buildIncorrectFeedbackPhrase('correr', 40, 95)).toBe('fallaste');
  });

  it('translates every incorrect tier', () => {
    expect(buildIncorrectFeedbackPhrase('correr', 92, 95, 'en')).toBe('so close, but not quite');
    expect(buildIncorrectFeedbackPhrase('correr', 80, 95, 'en')).toBe('close');
    expect(buildIncorrectFeedbackPhrase('correr', 60, 95, 'en')).toBe('a little off');
    expect(buildIncorrectFeedbackPhrase('correr', 40, 95, 'en')).toBe('you failed');
    expect(buildIncorrectFeedbackPhrase('correr', 40, 95, 'fr')).toBe('raté');
    expect(buildIncorrectFeedbackPhrase('correr', 40, 95, 'de')).toBe('leider falsch');
    expect(buildIncorrectFeedbackPhrase('correr', 40, 95, 'it')).toBe('hai sbagliato');
    expect(buildIncorrectFeedbackPhrase('correr', 40, 95, 'pt')).toBe('você errou');
  });

  it('falls back to Spanish for unknown languages', () => {
    expect(buildIncorrectFeedbackPhrase('correr', 40, 95, 'xx')).toBe('fallaste');
  });
});
