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
import ptNav from './pt/nav.json';
import ptAuth from './pt/auth.json';
import ptDashboard from './pt/dashboard.json';
import ptGame from './pt/game.json';
import ptEditor from './pt/editor.json';
import ptStore from './pt/store.json';
import ptOnboarding from './pt/onboarding.json';
import ptSettings from './pt/settings.json';
import ptErrors from './pt/errors.json';

import frCommon from './fr/common.json';
import frNav from './fr/nav.json';
import frAuth from './fr/auth.json';
import frDashboard from './fr/dashboard.json';
import frGame from './fr/game.json';
import frEditor from './fr/editor.json';
import frStore from './fr/store.json';
import frOnboarding from './fr/onboarding.json';
import frSettings from './fr/settings.json';
import frErrors from './fr/errors.json';

import deCommon from './de/common.json';
import deNav from './de/nav.json';
import deAuth from './de/auth.json';
import deDashboard from './de/dashboard.json';
import deGame from './de/game.json';
import deEditor from './de/editor.json';
import deStore from './de/store.json';
import deOnboarding from './de/onboarding.json';
import deSettings from './de/settings.json';
import deErrors from './de/errors.json';

import zhCommon from './zh/common.json';
import zhNav from './zh/nav.json';
import zhAuth from './zh/auth.json';
import zhDashboard from './zh/dashboard.json';
import zhGame from './zh/game.json';
import zhEditor from './zh/editor.json';
import zhStore from './zh/store.json';
import zhOnboarding from './zh/onboarding.json';
import zhSettings from './zh/settings.json';
import zhErrors from './zh/errors.json';

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
      nav: ptNav,
      auth: ptAuth,
      dashboard: ptDashboard,
      game: ptGame,
      editor: ptEditor,
      store: ptStore,
      onboarding: ptOnboarding,
      settings: ptSettings,
      errors: ptErrors,
    },
    fr: {
      common: frCommon,
      nav: frNav,
      auth: frAuth,
      dashboard: frDashboard,
      game: frGame,
      editor: frEditor,
      store: frStore,
      onboarding: frOnboarding,
      settings: frSettings,
      errors: frErrors,
    },
    de: {
      common: deCommon,
      nav: deNav,
      auth: deAuth,
      dashboard: deDashboard,
      game: deGame,
      editor: deEditor,
      store: deStore,
      onboarding: deOnboarding,
      settings: deSettings,
      errors: deErrors,
    },
    zh: {
      common: zhCommon,
      nav: zhNav,
      auth: zhAuth,
      dashboard: zhDashboard,
      game: zhGame,
      editor: zhEditor,
      store: zhStore,
      onboarding: zhOnboarding,
      settings: zhSettings,
      errors: zhErrors,
    },
  },
  lng: initialLang,
  fallbackLng: ['es', 'en'],
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
