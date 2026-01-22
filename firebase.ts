
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, doc, setDoc, deleteDoc, collection, query, where, onSnapshot, connectFirestoreEmulator } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyForLocalDevelopment",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "localhost:9099",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "glimmind-local",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "glimmind-local.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef123456"
};

const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let app, auth: any, db: any;
const googleProvider = new GoogleAuthProvider();

if (isConfigured) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  auth = getAuth(app);
  db = getFirestore(app);
  
  // Conectar a emuladores locales en desarrollo
  if (process.env.NODE_ENV === 'development') {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099');
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔥 Conectado a emuladores de Firebase');
    } catch (error) {
      console.log('⚠️ Emuladores ya conectados o no disponibles');
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
  isConfigured
};
