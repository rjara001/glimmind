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

const FRIENDLY_MESSAGES: Record<string, string> = {
  'auth/popup-blocked': 'El navegador bloqueó la ventana de acceso. Se intentó redirigir automáticamente.',
  'auth/cancelled-popup-request': 'Se canceló una ventana de acceso anterior. Intenta de nuevo.',
  'auth/popup-closed-by-user': 'Cerraste la ventana de acceso.',
  'auth/web-storage-unsupported': 'Este navegador bloquea el almacenamiento local requerido para iniciar sesión.',
  'auth/network-request-failed': 'Error de red. Revisá tu conexión.',
  'auth/too-many-requests': 'Demasiados intentos fallidos. Esperá un momento e intentá de nuevo.',
  'auth/unauthorized-domain': 'Dominio no autorizado para iniciar sesión.',
  'auth/operation-not-allowed': 'El proveedor de acceso no está habilitado en el proyecto.',
  'auth/account-exists-with-different-credential': 'Ya existe una cuenta con ese correo usando otro método.',
  'auth/user-disabled': 'Esta cuenta está deshabilitada.',
};

export function describeAuthError(error: unknown): string {
  const err = error as AuthLoginError | null;

  if (isCoopIsolationError(error)) {
    return 'Login no disponible en este navegador (aislamiento de origen). Probá con otro navegador o ventana privada.';
  }

  const code = err?.code;
  if (code && FRIENDLY_MESSAGES[code]) {
    return FRIENDLY_MESSAGES[code];
  }

  if (code) {
    return `Error de autenticación (${code}).`;
  }
  return 'No pudimos iniciar sesión. Intentá de nuevo.';
}