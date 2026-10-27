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

const LANGUAGE_KEY = 'glimmind_language';

const getInitialLanguage = (): string => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved && (saved === 'es' || saved === 'en')) {
      return saved;
    }
  }
  if (typeof navigator !== 'undefined' && navigator.language) {
    const lang = navigator.language.split('-')[0];
    if (lang === 'en' || lang === 'es') {
      return lang;
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
  },
  lng: initialLang,
  fallbackLng: 'es',
  supportedLngs: ['es', 'en'],
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
