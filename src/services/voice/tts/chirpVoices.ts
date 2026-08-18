import { ChirpVoice } from '../../../types';

export function isChirpVoiceId(voiceId: string | undefined): boolean {
  if (!voiceId) return false;
  const upper = voiceId.toUpperCase();
  return upper.includes('CHIRP') && (upper.includes('HD') || upper.includes('3-HD'));
}

export function getChirpVoiceLabel(voiceId: string): string {
  return voiceId;
}

export function getDefaultChirpVoiceId(_lang?: string): string | undefined {
  return undefined;
}
