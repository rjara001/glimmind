import { auth, isUsingEmulators } from '../firebase';
import { SYNC_CONFIG } from '../constants/syncConfig';

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'fladycard-22a3e';
const PROD_FUNCTIONS_BASE = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;
const EMULATOR_FUNCTIONS_BASE = isUsingEmulators ? '/functions' : `http://localhost:5001/${PROJECT_ID}/us-central1`;

const FUNCTIONS_BASE = env.VITE_FUNCTIONS_BASE
  || (isUsingEmulators ? EMULATOR_FUNCTIONS_BASE : PROD_FUNCTIONS_BASE);

const SECOND_GEN_FUNCTIONS: Record<string, string | undefined> = {
  synthesizeSpeech: isUsingEmulators ? undefined : 'https://us-central1-fladycard-22a3e.cloudfunctions.net',
};

// ⚠️ Desactivamos USE_CLEAN_URLS por defecto a menos que esté configurado explícitamente,
// para asegurar que las llamadas vayan a la URL real de Cloud Functions si no hay proxy.
const USE_CLEAN_URLS = env.VITE_USE_CLEAN_URLS !== 'false'; 

async function getToken(forceRefresh = false): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }
}

export interface FunctionCallError extends Error {
  code?: string;
  detail?: string;
  // zod fieldErrors from a 400 validation response. Without it the caller only
  // sees "Invalid request body" and cannot tell which field was rejected.
  fieldErrors?: Record<string, string[]>;
  fallbackAvailable?: boolean;
}

export async function callFunction<T>(functionName: string, data: any): Promise<T> {
  const token = await getToken();

  const override = SECOND_GEN_FUNCTIONS[functionName];
  const base = (override || FUNCTIONS_BASE).replace(/\/$/, '');
  const payload = JSON.stringify(data);
  let url: string;
  
  if (USE_CLEAN_URLS) {
    url = `/api/${functionName}`;
  } else {
    url = `${base}/${functionName}`;
  }

  console.log('[callFunction]', functionName, 'url=', url, 'tokenPresent=', !!token);

  // The Fetch spec caps keepalive request bodies at 64 KiB; a larger body is
  // rejected client-side with TypeError("Failed to fetch") before the request
  // ever reaches the network. bulkCreateList payloads (hundreds of cards) sit
  // far above that cap, so keepalive is only used for small payloads — the
  // same safe limit gameStore already uses to split keepalive sync batches.
  // Size is measured in UTF-8 bytes (what the browser enforces), not in
  // UTF-16 code units: accented Spanish text inflates bytes over .length.
  const payloadBytes = new TextEncoder().encode(payload).length;
  const keepalive = payloadBytes <= SYNC_CONFIG.keepaliveSafeLimit;

  const response = await fetch(url, {
    method: 'POST',
    keepalive, // Survives tab close/navigation; disabled for payloads over the safe limit
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: payload
  });

  const text = await response.text();

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    let errorCode: string | undefined;
    let detail: string | undefined;
    let fieldErrors: Record<string, string[]> | undefined;
    let fallbackAvailable: boolean | undefined;
    try {
      const errorJson = JSON.parse(text);
      errorCode = errorJson.code;
      detail = errorJson.detail;
      fieldErrors = errorJson.details;
      fallbackAvailable = errorJson.fallbackAvailable;
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      if (text) errorMessage = text.slice(0, 200);
    }
    const error: FunctionCallError = new Error(errorMessage);
    error.code = errorCode;
    error.detail = detail;
    error.fieldErrors = fieldErrors;
    error.fallbackAvailable = fallbackAvailable;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response from server at ${url}: ${text.slice(0, 100)}`);
  }
}