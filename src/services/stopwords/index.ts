import { STOPWORDS_ES } from './es';
import { STOPWORDS_EN } from './en';

export const SUPPORTED_LANGUAGES = {
  es: STOPWORDS_ES,
  en: STOPWORDS_EN,
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

/**
 * Returns the stopwords set for the specified language.
 * Falls back to combined ES+EN if language not supported or not specified.
 */
export function getStopwords(language?: string): Set<string> {
  if (language && language in SUPPORTED_LANGUAGES) {
    return SUPPORTED_LANGUAGES[language as SupportedLanguage];
  }
  // Fallback: combined ES + EN
  return new Set([...STOPWORDS_ES, ...STOPWORDS_EN]);
}

export { STOPWORDS_ES, STOPWORDS_EN };