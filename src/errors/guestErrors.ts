export const GUEST_AI_SIGNUP_MESSAGE =
  'La generación con IA requiere una cuenta. Crea tu usuario gratis para crear barajas desde YouTube o texto.';

export class GuestFeatureRequiredError extends Error {
  constructor(message: string = GUEST_AI_SIGNUP_MESSAGE) {
    super(message);
    this.name = 'GuestFeatureRequiredError';
  }
}