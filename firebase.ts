
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
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc, 
  updateDoc, 
  getDocs, 
  connectFirestoreEmulator 
} from 'firebase/firestore';

// Priorizar variables de entorno de producción (Vite usa import.meta.env o process.env según el bundler)
const getEnv = (key: string) => {
  // @ts-ignore
  return (typeof process !== 'undefined' ? process.env[key] : null) || (import.meta as any).env?.[key];
};

const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || "fake-api-key",
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || "demo-glimmind.firebaseapp.com",
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || "demo-glimmind",
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || "demo-glimmind.appspot.com",
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || "123456789",
  appId: getEnv('VITE_FIREBASE_APP_ID') || "1:123456789:web:abcdef"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Solo conectar a emuladores si estamos en localhost Y no tenemos API KEY real
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
  firebaseConfig.apiKey === 'fake-api-key';

if (isLocal) {
  if (!(globalThis as any)._fb_emulators_connected) {
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "localhost", 8080);
      (globalThis as any)._fb_emulators_connected = true;
      console.log("🔥 Conectado a emuladores locales");
    } catch (e) {
      console.warn("Aviso emuladores:", e);
    }
  }
}

export const isConfigured = firebaseConfig.apiKey !== "fake-api-key";

export { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs
};
