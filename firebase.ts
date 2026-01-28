import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, collection, query, where, doc, setDoc, deleteDoc, getDocs } from 'firebase/firestore';

// Usar el prefijo 'demo-' es fundamental para que el SDK no intente contactar con los servidores reales de Google.
const env = (import.meta as any).env ?? {};
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "fake-api-key",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "demo-glimmind.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "demo-glimmind",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "demo-glimmind.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef",
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

// Detectar entorno local de forma más robusta
const isLocal = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' || 
   window.location.hostname.includes('192.168.'));

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

if (isLocal) {
  if (!(globalThis as any)._fb_emulators_connected) {
    console.group("🔥 Firebase Emulator Connection");
    console.log("Proyecto ID:", firebaseConfig.projectId);
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      console.log("✅ Auth Emulator: http://localhost:9099");
      
      connectFirestoreEmulator(db, "localhost", 8080);
      console.log("✅ Firestore Emulator: localhost:8080");
      
      (globalThis as any)._fb_emulators_connected = true;
    } catch (e) {
      console.warn("⚠️ Los emuladores ya estaban conectados o hubo un error:", e);
    }
    console.groupEnd();
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
  doc,
  setDoc,
  deleteDoc,
  getDocs
};
