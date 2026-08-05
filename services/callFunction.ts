import { auth } from '../firebase';

const FUNCTIONS_BASE = (import.meta as any).env?.VITE_FUNCTIONS_BASE
  || 'https://us-central1-fladycard-22a3e.cloudfunctions.net';

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

  const response = await fetch(`${FUNCTIONS_BASE}/${functionName}`, {
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
