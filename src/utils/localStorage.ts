export class LocalStorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalStorageQuotaError';
  }
}

/**
 * Checks if an error is a quota exceeded error.
 * Handles cross-browser differences:
 * - Chrome/Edge: DOMException with name 'QuotaExceededError', code 22
 * - Firefox: DOMException with name 'NS_ERROR_DOM_QUOTA_REACHED', code 1014
 * - Safari: DOMException with name 'QuotaExceededError', code 22
 * - Some browsers may throw plain objects with name/code properties
 */
export function isQuotaExceededError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { name?: string; code?: number };
  return (
    e.name === 'QuotaExceededError' ||
    e.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    e.code === 22 ||
    e.code === 1014
  );
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (isQuotaExceededError(error)) {
      console.warn(`localStorage quota exceeded for key: ${key}`);
    } else {
      console.error(`localStorage setItem failed for key: ${key}`, error);
    }
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`localStorage removeItem failed for key: ${key}`, error);
    return false;
  }
}

export function safeParse<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function safeStringify(key: string, value: unknown): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch {
    return false;
  }
}