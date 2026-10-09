
import { initializeApp, getApps } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
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
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
  connectFirestoreEmulator 
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const config = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID
};

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

// App Check initialization (after initializeApp)
if (typeof window !== 'undefined' && !isDemo) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider('6LdRFb8tAAAAAK-htVwM7FLJM77j2DjegVC6Wzhq'),
    isTokenAutoRefreshEnabled: true,
  });
}

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();
// Without this, Google silently reuses the active browser session, so after
// signing out the user lands straight back in the previous account instead of
// being offered the account chooser.
googleProvider.setCustomParameters({ prompt: 'select_account' });

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
    connectFirestoreEmulator(db, "localhost", 9080);
    connectFunctionsEmulator(functions, "localhost", 9001);
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
  storage,
  googleProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  collection,
  query,
  where,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs,
  getDoc,
  orderBy,
  limit,
  addDoc,
  serverTimestamp,
};
