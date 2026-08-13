const LANGUAGE_FLAG_MAP: Record<string, string> = {
  es: '🇪🇸',
  en: '🇬🇧',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇧🇷',
  'pt-br': '🇧🇷',
  ja: '🇯🇵',
  ko: '🇰🇷',
  'zh-cn': '🇨🇳',
  ru: '🇷🇺',
  ar: '🇸🇦',
  nl: '🇳🇱',
  sv: '🇸🇪',
  pl: '🇵🇱',
  tr: '🇹🇷',
  el: '🇬🇷',
  hi: '🇮🇳',
  uk: '🇺🇦',
  vi: '🇻🇳',
  th: '🇹🇭',
};

export function getLanguageFlag(lang: string | null | undefined): string {
  if (!lang) return '🌐';
  const normalized = lang.toLowerCase();
  const base = normalized.split('-')[0];
  return LANGUAGE_FLAG_MAP[normalized] ?? LANGUAGE_FLAG_MAP[base] ?? '🌐';
}
