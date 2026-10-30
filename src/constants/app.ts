export const GUEST_ID = 'dev-user-local';
export const GUEST_UID = GUEST_ID;
export const LAST_PLAYED_KEY = 'glimmind_last_played';
export const REVEAL_AUTO_NEXT_SECONDS = 5;
export const PRACTICE_REVEAL_DELAY_SECONDS = 5;
export const PRACTICE_AUTO_ADVANCE_SECONDS = REVEAL_AUTO_NEXT_SECONDS;

export interface LanguageOption {
  code: string;
  label: string;
  flag: string;
  short: string;
}

export const SUPPORTED_LANGUAGES: readonly LanguageOption[] = [
  { code: 'es', label: 'Español', flag: '🇪🇸', short: 'ES' },
  { code: 'en', label: 'English', flag: '🇬🇧', short: 'EN' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', short: 'PT' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', short: 'FR' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', short: 'DE' },
  { code: 'zh', label: '中文', flag: '🇨🇳', short: 'ZH' },
] as const;

export const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);