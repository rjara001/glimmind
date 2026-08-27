import { auth, isUsingEmulators } from '../firebase';

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'fladycard-22a3e';
const PROD_FUNCTIONS_BASE = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;
const EMULATOR_FUNCTIONS_BASE = isUsingEmulators ? '/functions' : `http://localhost:5001/${PROJECT_ID}/us-central1`;

const FUNCTIONS_BASE = env.VITE_FUNCTIONS_BASE
  || (isUsingEmulators ? EMULATOR_FUNCTIONS_BASE : PROD_FUNCTIONS_BASE);

const SECOND_GEN_FUNCTIONS: Record<string, string> = {
  synthesizeSpeech: isUsingEmulators ? undefined : 'https://us-central1-fladycard-22a3e.cloudfunctions.net',
};

async function getToken(): Promise<string | null> {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  try {
    return await currentUser.getIdToken();
  } catch {
    return null;
  }
}

export interface FunctionCallError extends Error {
  code?: string;
  detail?: string;
  fallbackAvailable?: boolean;
}

export async function callFunction<T>(functionName: string, data: any): Promise<T> {
  const token = await getToken();

  const override = SECOND_GEN_FUNCTIONS[functionName];
  const base = (override || FUNCTIONS_BASE).replace(/\/$/, '');
  const payload = JSON.stringify(data);
  const url = `${base}/${functionName}`;

  console.log('[callFunction]', functionName, 'url=', url, 'base=', base, 'isUsingEmulators=', isUsingEmulators);

  const response = await fetch(url, {
    method: 'POST',
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
    let fallbackAvailable: boolean | undefined;
    try {
      const errorJson = JSON.parse(text);
      errorCode = errorJson.code;
      detail = errorJson.detail;
      fallbackAvailable = errorJson.fallbackAvailable;
      errorMessage = errorJson.message || errorJson.error || errorMessage;
    } catch {
      if (text) errorMessage = text.slice(0, 200);
    }
    const error: FunctionCallError = new Error(errorMessage);
    error.code = errorCode;
    error.detail = detail;
    error.fallbackAvailable = fallbackAvailable;
    throw error;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}
