import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import common from './es/common.json';
import nav from './es/nav.json';
import auth from './es/auth.json';
import dashboard from './es/dashboard.json';
import game from './es/game.json';
import editor from './es/editor.json';
import store from './es/store.json';
import onboarding from './es/onboarding.json';
import settings from './es/settings.json';
import errors from './es/errors.json';

void i18n.use(initReactI18next).init({
  resources: {
    es: {
      common,
      nav,
      auth,
      dashboard,
      game,
      editor,
      store,
      onboarding,
      settings,
      errors,
    },
  },
  lng: typeof navigator !== 'undefined' ? navigator.language : 'es',
  fallbackLng: 'es',
  supportedLngs: ['es'],
  defaultNS: 'common',
  compatibilityJSON: 'v4',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
