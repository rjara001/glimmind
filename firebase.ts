
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc, getDocs, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // Estos valores se inyectan en producción
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "demo-no-project", // Usamos el ID del emulador por defecto
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY" || isLocalhost;

let app, auth: any, db: any;
const googleProvider = new GoogleAuthProvider();

if (isConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);

  if (isLocalhost) {
    // Evitar reconexiones múltiples durante Hot Reload
    if (!(auth as any)._emulatorConnected) {
      console.log("🛠️ Conectando a emuladores locales...");
      connectAuthEmulator(auth, "http://localhost:9099");
      connectFirestoreEmulator(db, "localhost", 8080);
      (auth as any)._emulatorConnected = true;
    }
  }
}

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
  getDocs,
  isConfigured
};
