export const PREMIUM_CHECKOUT_SUCCESS_PARAM = 'upgrade';
export const PREMIUM_CHECKOUT_SUCCESS_VALUE = 'success';
export const PREMIUM_CHECKOUT_CANCELED_VALUE = 'canceled';

export const PREMIUM_CHECKOUT_SUCCESS_URL = '/settings?upgrade=success';
export const PREMIUM_CHECKOUT_CANCEL_URL = '/settings?upgrade=canceled';

// Stripe redirects back before the webhook writes meta.tier, so the return trip
// polls getQuota until the tier flips. 1.5s covers the usual webhook latency;
// 15s is the ceiling before telling the user it is still pending.
export const PREMIUM_POLL_INTERVAL_MS = 1500;
export const PREMIUM_POLL_TIMEOUT_MS = 15000;

export const PREMIUM_TOAST_UPGRADED = 'Listo. Tu cuenta ya es Premium.';
export const PREMIUM_TOAST_PENDING = 'Pago recibido. Estamos activando tu plan, actualizá en unos segundos.';
export const PREMIUM_TOAST_CHECKOUT_CANCELED = 'Cancelaste el pago. Tu plan sigue siendo el gratuito.';
export const PREMIUM_TOAST_CHECKOUT_ERROR = 'No pudimos abrir el pago. Intentá de nuevo.';
export const PREMIUM_TOAST_ALREADY_PREMIUM = 'Tu cuenta ya es Premium.';
export const PREMIUM_TOAST_GUARD = 'Inicia sesión con Google para cambiar tu plan.';

// Landing page -> login -> SettingsView. LandingPage is only rendered for
// signed-out visitors, so the checkout cannot be started there directly.
export const PREMIUM_LANDING_NEXT_QUERY = 'next';
export const PREMIUM_LANDING_NEXT_PATH = '/settings';