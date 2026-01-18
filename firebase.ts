
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, onSnapshot, query, where, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Reemplaza esto con tu configuración real de Firebase Console
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Verificar si las credenciales son las de ejemplo
const isConfigured = firebaseConfig.apiKey !== "YOUR_API_KEY";

let auth: any;
let db: any;
const googleProvider = new GoogleAuthProvider();

if (isConfigured) {
  try {
    const app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (e) {
    console.warn("Error inicializando Firebase:", e);
  }
}

export { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  deleteDoc,
  isConfigured
};
