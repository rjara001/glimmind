import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

const AppNameProbe = () => {
  const { t } = useTranslation();
  return <span>{t('appName')}</span>;
};

describe('i18n smoke (P2)', () => {
  it('renders the Spanish catalogue value through t()', () => {
    render(<AppNameProbe />);
    expect(screen.getByText('Glimmind')).toBeInTheDocument();
  });
});
