import { VoiceCommandId, VoiceCommandsConfig } from '../../types';
import { normalizeText } from '../../utils/text';

export const DEFAULT_VOICE_COMMANDS: VoiceCommandsConfig = {
  reveal: ['revelar', 'mostrar', 'reveal', 'show'],
  pass: ['pasar', 'siguiente', 'next', 'pass'],
  continue: ['continuar', 'adelante', 'continue'],
  stop: ['stop', 'detener', 'parar', 'alto'],
};

const COMMAND_IDS: VoiceCommandId[] = ['reveal', 'pass', 'continue', 'stop'];

export function resolveVoiceCommands(
  overrides?: Partial<VoiceCommandsConfig>,
): VoiceCommandsConfig {
  const resolved: VoiceCommandsConfig = { ...DEFAULT_VOICE_COMMANDS };
  for (const id of COMMAND_IDS) {
    const candidate = overrides?.[id];
    if (candidate && candidate.length > 0) {
      const cleaned = candidate.map((keyword) => keyword.trim()).filter(Boolean);
      if (cleaned.length > 0) {
        resolved[id] = cleaned;
      }
    }
  }
  return resolved;
}

export function normalizeCommandText(text: string): string {
  return normalizeText(text).replace(/\s+/g, ' ');
}

function isWordBoundary(char: string | undefined): boolean {
  return char === undefined || !/[a-z0-9]/.test(char);
}

export function matchVoiceCommand(
  text: string,
  commands: VoiceCommandsConfig,
): VoiceCommandId | null {
  const normalized = normalizeCommandText(text);
  if (!normalized) return null;

  for (const id of COMMAND_IDS) {
    const keywords = commands[id];
    for (const keyword of keywords) {
      const normalizedKeyword = normalizeCommandText(keyword);
      if (!normalizedKeyword) continue;
      if (normalized === normalizedKeyword) return id;
      if (
        normalized.startsWith(normalizedKeyword) &&
        isWordBoundary(normalized.charAt(normalizedKeyword.length))
      ) {
        return id;
      }
    }
  }
  return null;
}
