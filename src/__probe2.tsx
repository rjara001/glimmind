import { useTranslation } from 'react-i18next';
import i18n from './i18n';

export const Probe2 = () => {
  const { t } = useTranslation();
  return (
    <>
      <span>{t('auth.empezar')}</span>
      <span>{t('auth:empezar')}</span>
      <span>{t('nav:panel')}</span>
      <span>{i18n.t('auth.empezar')}</span>
      <span>{i18n.t('auth:empezar')}</span>
      <span>{i18n.t('appName')}</span>
      <span>{t('appName')}</span>
    </>
  );
};
