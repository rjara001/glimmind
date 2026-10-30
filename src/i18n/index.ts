import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import esCommon from './es/common.json';
import esNav from './es/nav.json';
import esAuth from './es/auth.json';
import esDashboard from './es/dashboard.json';
import esGame from './es/game.json';
import esEditor from './es/editor.json';
import esStore from './es/store.json';
import esOnboarding from './es/onboarding.json';
import esSettings from './es/settings.json';
import esErrors from './es/errors.json';

import enCommon from './en/common.json';
import enNav from './en/nav.json';
import enAuth from './en/auth.json';
import enDashboard from './en/dashboard.json';
import enGame from './en/game.json';
import enEditor from './en/editor.json';
import enStore from './en/store.json';
import enOnboarding from './en/onboarding.json';
import enSettings from './en/settings.json';
import enErrors from './en/errors.json';

import ptCommon from './pt/common.json';
import frCommon from './fr/common.json';
import deCommon from './de/common.json';
import zhCommon from './zh/common.json';
import { SUPPORTED_LANGUAGES } from '../constants/app';

const LANGUAGE_KEY = 'glimmind_lang';
const SUPPORTED_LANGUAGE_CODES = SUPPORTED_LANGUAGES.map((l) => l.code);

const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && SUPPORTED_LANGUAGE_CODES.includes(saved)) {
      return saved;
    }
  }
  return 'es';
};

const initialLang = getInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    es: {
      common: esCommon,
      nav: esNav,
      auth: esAuth,
      dashboard: esDashboard,
      game: esGame,
      editor: esEditor,
      store: esStore,
      onboarding: esOnboarding,
      settings: esSettings,
      errors: esErrors,
    },
    en: {
      common: enCommon,
      nav: enNav,
      auth: enAuth,
      dashboard: enDashboard,
      game: enGame,
      editor: enEditor,
      store: enStore,
      onboarding: enOnboarding,
      settings: enSettings,
      errors: enErrors,
    },
    pt: {
      common: ptCommon,
    },
    fr: {
      common: frCommon,
    },
    de: {
      common: deCommon,
    },
    zh: {
      common: zhCommon,
    },
  },
  lng: initialLang,
  fallbackLng: 'es',
  supportedLngs: SUPPORTED_LANGUAGE_CODES,
  defaultNS: 'common',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  returnNull: false,
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLang;
}

i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem(LANGUAGE_KEY, lng);
  }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lng;
  }
});

export default i18n;
