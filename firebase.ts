
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDocs, connectFirestoreEmulator } from 'firebase/firestore';

// Usar el prefijo 'demo-' es fundamental para que el SDK no intente contactar con los servidores reales de Google.
const firebaseConfig = {
  apiKey: "fake-api-key", 
  authDomain: "demo-glimmind.firebaseapp.com",
  projectId: "demo-glimmind", 
  storageBucket: "demo-glimmind.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
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
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  getDocs
};
