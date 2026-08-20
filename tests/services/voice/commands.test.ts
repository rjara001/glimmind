import { describe, it, expect } from 'vitest';
import {
  DEFAULT_VOICE_COMMANDS,
  getAllVoiceCommandWords,
  matchVoiceCommand,
  normalizeCommandText,
  resolveVoiceCommands,
} from '@/services/voice/stt/commands';
import { VoiceCommandsConfig } from '@//types';

describe('normalizeCommandText', () => {
  it('trims, lowercases, and strips accents', () => {
    expect(normalizeCommandText('  Continuar ')).toBe('continuar');
    expect(normalizeCommandText('Detenér')).toBe('detener');
  });

  it('collapses whitespace', () => {
    expect(normalizeCommandText('next   card')).toBe('next card');
  });
});

describe('resolveVoiceCommands', () => {
  it('returns defaults when no overrides are given', () => {
    expect(resolveVoiceCommands()).toEqual(DEFAULT_VOICE_COMMANDS);
  });

  it('merges provided commands with defaults for the rest', () => {
    const resolved = resolveVoiceCommands({ reveal: ['mostrar'] });
    expect(resolved.reveal).toEqual(['mostrar']);
    expect(resolved.pass).toEqual(DEFAULT_VOICE_COMMANDS.pass);
    expect(resolved.continue).toEqual(DEFAULT_VOICE_COMMANDS.continue);
    expect(resolved.stop).toEqual(DEFAULT_VOICE_COMMANDS.stop);
  });

  it('falls back to defaults for empty or blank keyword arrays', () => {
    expect(resolveVoiceCommands({ pass: [], stop: [' ', ''] }).pass).toEqual(
      DEFAULT_VOICE_COMMANDS.pass,
    );
    expect(resolveVoiceCommands({ stop: [' ', ''] }).stop).toEqual(DEFAULT_VOICE_COMMANDS.stop);
  });

  it('trims and drops blank keywords from provided arrays', () => {
    const resolved = resolveVoiceCommands({ continue: [' adelante ', '', 'continuar'] });
    expect(resolved.continue).toEqual(['adelante', 'continuar']);
  });
});

describe('getAllVoiceCommandWords', () => {
  it('flattens all default command keywords', () => {
    expect(getAllVoiceCommandWords()).toEqual([
      ...DEFAULT_VOICE_COMMANDS.reveal,
      ...DEFAULT_VOICE_COMMANDS.pass,
      ...DEFAULT_VOICE_COMMANDS.continue,
      ...DEFAULT_VOICE_COMMANDS.stop,
    ]);
  });

  it('flattens merged overrides with defaults', () => {
    const words = getAllVoiceCommandWords({ reveal: ['show'] });
    expect(words).toContain('show');
    expect(words).not.toContain('revelar');
    expect(words).toContain('next');
    expect(words).toContain('stop');
  });
});

describe('matchVoiceCommand', () => {
  it('matches exact keywords case-insensitively', () => {
    expect(matchVoiceCommand('Revelar', DEFAULT_VOICE_COMMANDS)).toBe('reveal');
    expect(matchVoiceCommand('reveal', DEFAULT_VOICE_COMMANDS)).toBe('reveal');
    expect(matchVoiceCommand('PASAR', DEFAULT_VOICE_COMMANDS)).toBe('pass');
  });

  it('matches normalized text with accents', () => {
    expect(matchVoiceCommand('continuár', DEFAULT_VOICE_COMMANDS)).toBe('continue');
    expect(matchVoiceCommand('detener', DEFAULT_VOICE_COMMANDS)).toBe('stop');
  });

  it('matches a keyword followed by a word boundary', () => {
    expect(matchVoiceCommand('siguiente por favor', DEFAULT_VOICE_COMMANDS)).toBe('pass');
    expect(matchVoiceCommand('stop ahora', DEFAULT_VOICE_COMMANDS)).toBe('stop');
  });

  it('does not match a keyword as a prefix of a longer word', () => {
    expect(matchVoiceCommand('stopwatch', DEFAULT_VOICE_COMMANDS)).toBeNull();
    expect(matchVoiceCommand('passport', DEFAULT_VOICE_COMMANDS)).toBeNull();
  });

  it('returns null for unknown or empty input', () => {
    expect(matchVoiceCommand('hola mundo', DEFAULT_VOICE_COMMANDS)).toBeNull();
    expect(matchVoiceCommand('', DEFAULT_VOICE_COMMANDS)).toBeNull();
    expect(matchVoiceCommand('   ', DEFAULT_VOICE_COMMANDS)).toBeNull();
  });

  it('matches against custom command lists', () => {
    const custom: VoiceCommandsConfig = {
      reveal: ['a'],
      pass: ['b'],
      continue: ['c'],
      stop: ['d'],
    };
    expect(matchVoiceCommand('b', custom)).toBe('pass');
    expect(matchVoiceCommand('aqui', custom)).toBeNull();
  });

  it('skips empty keywords in the list without matching', () => {
    const custom: VoiceCommandsConfig = {
      ...DEFAULT_VOICE_COMMANDS,
      stop: [''],
    };
    expect(matchVoiceCommand('stop', custom)).toBeNull();
  });
});
