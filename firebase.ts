
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDocs, connectFirestoreEmulator } from 'firebase/firestore';

// IMPORTANTE: El prefijo "demo-" es vital para que Firebase sepa que no necesita internet ni llaves reales
const firebaseConfig = {
  apiKey: "fake-api-key", 
  authDomain: "demo-glimmind.firebaseapp.com",
  projectId: "demo-glimmind", 
  storageBucket: "demo-glimmind.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

let app, auth: any, db: any;
const googleProvider = new GoogleAuthProvider();

// Inicializamos la app siempre, ya que para los emuladores no necesitamos validación real
app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
auth = getAuth(app);
db = getFirestore(app);

if (isLocalhost) {
  // Flag global para evitar el error de "Emulator already connected" en Hot Reload de React
  if (!(globalThis as any)._fb_emulators_connected) {
    console.log("🚀 Conectando Glimmind a Emuladores locales (Puerto 9099 y 8080)...");
    try {
      connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
      connectFirestoreEmulator(db, "localhost", 8080);
      (globalThis as any)._fb_emulators_connected = true;
    } catch (e) {
      console.warn("Aviso de conexión de emuladores:", e);
    }
  }
}

export const isConfigured = true; // Forzamos true ya que estamos en modo demo/local

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
