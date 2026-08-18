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

export async function callFunction<T>(functionName: string, data: any): Promise<T> {
  const token = await getToken();

  const override = SECOND_GEN_FUNCTIONS[functionName];
  const base = (override || FUNCTIONS_BASE).replace(/\/$/, '');
  const payload = JSON.stringify(data);
  
  const response = await fetch(`${base}/${functionName}`, {
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
    try {
      const errorJson = JSON.parse(text);
      errorMessage = errorJson.error || errorJson.detail || errorMessage;
    } catch {
      if (text) errorMessage = text.slice(0, 200);
    }
    throw new Error(errorMessage);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}
