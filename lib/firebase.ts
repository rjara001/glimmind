
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, collection, query, where, onSnapshot, connectFirestoreEmulator } from 'firebase/firestore';

// Usamos el mismo ID de proyecto demo para activar el modo offline/emulador automáticamente
const firebaseConfig = {
  apiKey: "fake-api-key", 
  authDomain: "demo-glimmind.firebaseapp.com",
  projectId: "demo-glimmind", 
  storageBucket: "demo-glimmind.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

if (isLocalhost) {
  if (!(globalThis as any)._fb_emulators_connected_lib) {
    console.log("🚀 (Lib) Conectando Glimmind a Emuladores locales...");
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "localhost", 8080);
      (globalThis as any)._fb_emulators_connected_lib = true;
    } catch (e) {
      console.warn("Aviso de conexión de emuladores en Lib:", e);
    }
  }
}

export const isConfigured = true;

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
  deleteDoc
};
