
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  onAuthStateChanged, 
  connectAuthEmulator 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDocs, 
  getDoc,
  connectFirestoreEmulator 
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// En Vite, las variables de entorno se acceden vía import.meta.env
// Usamos un cast a any para evitar errores de compilación si los tipos de Vite no están presentes en el entorno global
const config = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID
};

// Si no hay apiKey real, usamos una de respaldo para evitar que la app crashee en modo demo
const isDemo = !config.apiKey || config.apiKey === "fake-api-key";

const firebaseConfig = isDemo ? {
  apiKey: "fake-api-key",
  authDomain: "demo-glimmind.firebaseapp.com",
  projectId: "demo-glimmind",
  storageBucket: "demo-glimmind.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
} : config;

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const googleProvider = new GoogleAuthProvider();

// Connect emulators only in local dev (demo mode without keys, or explicit VITE_USE_EMULATORS=true)
const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env ?? {};
const useEmulatorsFlag = env.VITE_USE_EMULATORS === 'true';
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const isUsingEmulators = isLocalhost && (isDemo || useEmulatorsFlag);

interface EmulatorConnectionFlag {
  _fb_emulators_connected?: boolean;
}

function hasEmulatorsConnected(): boolean {
  return (globalThis as unknown as EmulatorConnectionFlag)._fb_emulators_connected === true;
}

function markEmulatorsConnected(): void {
  (globalThis as unknown as EmulatorConnectionFlag)._fb_emulators_connected = true;
}

if (isUsingEmulators && !hasEmulatorsConnected()) {
  try {
    connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "localhost", 8080);
    connectFunctionsEmulator(functions, "localhost", 5001);
    markEmulatorsConnected();
    console.log("🔥 Modo local: Emuladores conectados");
  } catch (e) {
    console.warn("Aviso emuladores:", e);
  }
}

export const isConfigured = !isDemo;

export { 
  auth, 
  db, 
  functions,
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  collection,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  getDoc
};
