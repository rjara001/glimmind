import i18n from '../i18n';

export interface AuthLoginError {
  code?: string;
  message?: string;
}

/**
 * Popup failures caused by browser cross-origin isolation (COOP) never surface
 * a Firebase auth code. They also cannot be recovered by signInWithRedirect,
 * because the popup window was already created in an isolated context.
 */
export function isCoopIsolationError(error: unknown): boolean {
  const err = error as AuthLoginError | null;
  const message = err?.message ?? '';
  return message.includes('Cross-Origin-Opener-Policy');
}

/** Firebase codes that are always resolved by falling back to a full-page redirect. */
const REDIRECT_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/cancelled-popup-request',
  'auth/web-storage-unsupported',
]);

export function shouldUseRedirectFallback(error: unknown): boolean {
  const err = error as AuthLoginError | null;
  if (!err?.code) return false;
  return REDIRECT_FALLBACK_CODES.has(err.code);
}

/** The user closed the popup on purpose. Not an error worth reporting. */
export function isUserCancellation(error: unknown): boolean {
  const err = error as AuthLoginError | null;
  return err?.code === 'auth/popup-closed-by-user';
}

const FRIENDLY_MESSAGE_KEYS = {
  'auth/popup-blocked': 'errors.el_navegador_bloqueo_la_ventana_de_acceso_',
  'auth/cancelled-popup-request': 'errors.se_cancelo_una_ventana_de_acceso_anterior_',
  'auth/popup-closed-by-user': 'errors.cerraste_la_ventana_de_acceso',
  'auth/web-storage-unsupported': 'errors.este_navegador_bloquea_el_almacenamiento_l',
  'auth/network-request-failed': 'errors.error_de_red_revisa_tu_conexion',
  'auth/too-many-requests': 'errors.demasiados_intentos_fallidos_espera_un_mom',
  'auth/unauthorized-domain': 'errors.dominio_no_autorizado_para_iniciar_sesion',
  'auth/operation-not-allowed': 'errors.el_proveedor_de_acceso_no_esta_habilitado_',
  'auth/account-exists-with-different-credential': 'errors.ya_existe_una_cuenta_con_ese_correo_usando',
  'auth/user-disabled': 'errors.esta_cuenta_esta_deshabilitada',
} as const;

type FriendlyAuthCode = keyof typeof FRIENDLY_MESSAGE_KEYS;

export function describeAuthError(error: unknown): string {
  const err = error as AuthLoginError | null;

  if (isCoopIsolationError(error)) {
    return i18n.t('errors.login_no_disponible_en_este_navegador_aisl');
  }

  const code = err?.code;
  if (code && code in FRIENDLY_MESSAGE_KEYS) {
    return i18n.t(FRIENDLY_MESSAGE_KEYS[code as FriendlyAuthCode]);
  }

  if (code) {
    return i18n.t('errors.error_de_autenticacion', { code });
  }
  return i18n.t('errors.no_pudimos_iniciar_sesion_intenta_de_nuevo');
}
