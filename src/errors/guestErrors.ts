import i18n from '../i18n';

export function getGuestAiSignupMessage(): string {
  return i18n.t('errors.la_generacion_con_ia_requiere_una_cuenta_c');
}

export class GuestFeatureRequiredError extends Error {
  constructor(message: string = getGuestAiSignupMessage()) {
    super(message);
    this.name = 'GuestFeatureRequiredError';
  }
}
