import 'i18next';
import type common from '../i18n/es/common.json';
import type de from '../i18n/de/common.json';
import type en from '../i18n/en/common.json';
import type es from '../i18n/es/common.json';
import type fr from '../i18n/fr/common.json';
import type pt from '../i18n/pt/common.json';
import type zh from '../i18n/zh/common.json';
import type nav from '../i18n/es/nav.json';
import type auth from '../i18n/es/auth.json';
import type dashboard from '../i18n/es/dashboard.json';
import type game from '../i18n/es/game.json';
import type editor from '../i18n/es/editor.json';
import type store from '../i18n/es/store.json';
import type onboarding from '../i18n/es/onboarding.json';
import type settings from '../i18n/es/settings.json';
import type errors from '../i18n/es/errors.json';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: {
      common: typeof common;
      de: typeof de;
      en: typeof en;
      es: typeof es;
      fr: typeof fr;
      pt: typeof pt;
      zh: typeof zh;
      nav: typeof nav;
      auth: typeof auth;
      dashboard: typeof dashboard;
      game: typeof game;
      editor: typeof editor;
      store: typeof store;
      onboarding: typeof onboarding;
      settings: typeof settings;
      errors: typeof errors;
    };
  }
}
