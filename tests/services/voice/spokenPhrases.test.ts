import { describe, it, expect } from 'vitest';
import {
  buildCommandAcknowledgement,
  buildCorrectFeedbackPhrase,
  buildIncorrectFeedbackPhrase,
} from '@/services/voice/spokenPhrases';

describe('buildCommandAcknowledgement', () => {
  it('returns the pass acknowledgement phrase', () => {
    expect(buildCommandAcknowledgement('pass')).toBe('Pues vamos con la siguiente');
  });

  it('returns the stop acknowledgement phrase', () => {
    expect(buildCommandAcknowledgement('stop')).toBe('Deteniendo el juego');
  });

  it('includes the expected answer in the reveal acknowledgement', () => {
    expect(buildCommandAcknowledgement('reveal', 'to run')).toBe(
      'Esperaba que dijieras: to run',
    );
  });

  it('returns null for reveal without an expected answer', () => {
    expect(buildCommandAcknowledgement('reveal')).toBeNull();
  });

  it('returns null for commands without an acknowledgement phrase', () => {
    expect(buildCommandAcknowledgement('continue')).toBeNull();
  });
});

describe('buildCorrectFeedbackPhrase', () => {
  it('returns the short correct feedback phrase', () => {
    expect(buildCorrectFeedbackPhrase('correr', 100, 95)).toBe('muy bien, sigue asi');
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
});
