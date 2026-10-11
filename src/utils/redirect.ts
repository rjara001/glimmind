export const NEXT_PATH_QUERY = 'next';

const INTERNAL_PATH_PREFIX = '/';

/**
 * Resolves a post-login redirect target from the `next` query param.
 *
 * Only same-origin, single-slash paths are accepted. A value starting with `//`
 * or `scheme:` is a protocol-relative or absolute URL, which would turn the login
 * route into an open redirect, so it falls back to the dashboard.
 */
export function resolveNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback;
  if (!raw.startsWith(INTERNAL_PATH_PREFIX)) return fallback;
  if (raw.startsWith('//')) return fallback;
  if (raw.includes('\\')) return fallback;
  return raw;
}