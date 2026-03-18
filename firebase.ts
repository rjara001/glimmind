
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

// Solo conectar emuladores si estamos en local y NO tenemos llaves reales
const isLocalhost = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

if (isLocalhost && isDemo) {
  if (!(globalThis as any)._fb_emulators_connected) {
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "localhost", 8080);
      connectFunctionsEmulator(functions, "localhost", 5001);
      (globalThis as any)._fb_emulators_connected = true;
      console.log("🔥 Modo local: Emuladores conectados");
    } catch (e) {
      console.warn("Aviso emuladores:", e);
    }
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
