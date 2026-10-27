import { useTranslation } from 'react-i18next';

export const Probe = () => {
  const { t } = useTranslation();
  return (
    <>
      <span>{t('appName')}</span>
      <span>{t('settings.cancel')}</span>
      <span>{t('settings:cancel')}</span>
      <span>{t('nav.panel')}</span>
      <span>{t('nav:panel')}</span>
      <span>{t('common:appName')}</span>
    </>
  );
};
