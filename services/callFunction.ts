import { auth, isUsingEmulators } from '../firebase';

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
const PROJECT_ID = env.VITE_FIREBASE_PROJECT_ID || 'fladycard-22a3e';
const PROD_FUNCTIONS_BASE = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;
const EMULATOR_FUNCTIONS_BASE = isUsingEmulators ? '/functions' : `http://localhost:5001/${PROJECT_ID}/us-central1`;

const FUNCTIONS_BASE = env.VITE_FUNCTIONS_BASE
  || (isUsingEmulators ? EMULATOR_FUNCTIONS_BASE : PROD_FUNCTIONS_BASE);

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

  const base = FUNCTIONS_BASE.replace(/\/$/, '');
  const response = await fetch(`${base}/${functionName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}
