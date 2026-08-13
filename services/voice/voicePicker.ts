export interface VoiceLike {
  lang: string;
  name: string;
  default: boolean;
  localService: boolean;
  voiceURI: string;
}

export function resolveVoiceForLang(
  lang: string | null,
  voices: VoiceLike[],
): VoiceLike | undefined {
  if (voices.length === 0) return undefined;
  if (!lang) {
    return voices.find((voice) => voice.default) ?? voices[0];
  }
  const requested = lang.toLowerCase();
  const base = requested.split('-')[0];
  return (
    voices.find((voice) => voice.lang.toLowerCase() === requested) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${base}-`)) ||
    voices.find((voice) => voice.lang.toLowerCase() === base) ||
    voices.find((voice) => voice.default) ||
    voices[0]
  );
}
