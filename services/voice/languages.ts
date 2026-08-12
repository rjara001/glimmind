import { normalizeText } from '../../utils/text';

const DEFAULT_VOICE_LANGUAGE = 'es';

const LANGUAGE_MAP: Record<string, string> = {
  ingles: 'en',
  english: 'en',
  englishusa: 'en',
  inglesamericano: 'en',
  inglesbritanico: 'en',
  british: 'en',
  espanol: 'es',
  spanish: 'es',
  castellano: 'es',
  frances: 'fr',
  french: 'fr',
  aleman: 'de',
  german: 'de',
  italiano: 'it',
  italian: 'it',
  portugues: 'pt',
  portuguese: 'pt',
  portuguesbrasil: 'pt-BR',
  portuguesbrasileiro: 'pt-BR',
  brasil: 'pt-BR',
  japones: 'ja',
  japanese: 'ja',
  coreano: 'ko',
  korean: 'ko',
  chino: 'zh-CN',
  chinese: 'zh-CN',
  mandarin: 'zh-CN',
  mandarinchinese: 'zh-CN',
  ruso: 'ru',
  russian: 'ru',
  arabe: 'ar',
  arabic: 'ar',
  neerlandes: 'nl',
  dutch: 'nl',
  holandes: 'nl',
  sueco: 'sv',
  swedish: 'sv',
  polaco: 'pl',
  polish: 'pl',
  turco: 'tr',
  turkish: 'tr',
  griego: 'el',
  greek: 'el',
  hindi: 'hi',
  ucraniano: 'uk',
  ukrainian: 'uk',
  vietnamita: 'vi',
  vietnamese: 'vi',
  tailandes: 'th',
  thai: 'th',
};

export interface VoiceLanguages {
  ttsLang: string | null;
  sttLang: string | null;
}

export interface VoiceLanguageOverrides {
  termLang?: string | null;
  defLang?: string | null;
}

export function detectLanguage(label: string): string | null {
  if (!label) return null;
  const key = normalizeText(label).replace(/[^a-z]/g, '');
  if (key.length === 0) return null;
  return LANGUAGE_MAP[key] ?? null;
}

export function resolveVoiceLanguages(
  concept: string,
  flipOrder: 'normal' | 'reversed',
  overrides: VoiceLanguageOverrides = {},
): VoiceLanguages {
  const parts = concept.split('/').map((part) => part.trim());
  const termLang = overrides.termLang ?? detectLanguage(parts[0] || '');
  const defLang = overrides.defLang ?? detectLanguage(parts[1] || '');

  // Two-tier fallback. detectLanguage returns null for labels it does not
  // recognise (e.g. "Valor 1"), which would leave ttsLang/sttLang null and
  // make TTS/STT fall back to an unknown default. Instead:
  //  1. an unrecognised side adopts the recognised side's language (handles
  //     "Valor 1 / Español" -> 'es'), and
  //  2. if neither side resolves (e.g. an opaque concept), use a sane default
  //     so the recognition pipeline never receives null.
  const resolvedTermLang = termLang || defLang || DEFAULT_VOICE_LANGUAGE;
  const resolvedDefLang = defLang || termLang || DEFAULT_VOICE_LANGUAGE;

  if (flipOrder === 'reversed') {
    return { ttsLang: resolvedDefLang, sttLang: resolvedTermLang };
  }
  return { ttsLang: resolvedTermLang, sttLang: resolvedDefLang };
}

export function resolveLanguages(
  concept: string,
  flipOrder: 'normal' | 'reversed',
): VoiceLanguages {
  return resolveVoiceLanguages(concept, flipOrder);
}
