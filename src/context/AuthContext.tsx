import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User as FirebaseUser,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  AuthError,
} from 'firebase/auth';
import { auth } from '../firebase';
import { GUEST_ID } from '../constants/app';
import { safeGetItem, safeRemoveItem } from '../utils/localStorage';
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AppUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapFirebaseUser = (firebaseUser: FirebaseUser): AppUser => ({
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName,
    email: firebaseUser.email,
    photoURL: firebaseUser.photoURL,
  });

  useEffect(() => {
    const initAuth = async () => {
      if (!auth) {
        setLoading(false);
        return;
      }

      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (err) {
        console.warn('Failed to set auth persistence:', err);
      }

      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          safeRemoveItem('glimmind_guest_user');
          setUser(mapFirebaseUser(firebaseUser));
        } else {
          // Guests are local-only: restore the persisted guest session so a
          // page reload does not bounce protected routes back to /login.
          // Mirrors the restore done in useAppBootstrap for gameStore.
          const savedGuest = safeGetItem('glimmind_guest_user');
          if (savedGuest) {
            try {
              const guest = JSON.parse(savedGuest) as AppUser | null;
              if (guest && guest.uid === GUEST_ID) {
                setUser(guest);
                setLoading(false);
                return;
              }
            } catch {
              // Ignore corrupted guest data
            }
          }
          setUser(null);
        }
        setLoading(false);
      });

      return () => unsubscribe();
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!auth) {
      setError('Autenticación de Firebase no inicializada');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(mapFirebaseUser(result.user));
    } catch (err) {
      const authError = err as AuthError;
      let message = 'No se pudo iniciar sesión. Inténtalo de nuevo.';

      switch (authError.code) {
        case 'auth/user-not-found':
          message = 'No hay ninguna cuenta con este correo.';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Correo o contraseña incorrectos.';
          break;
        case 'auth/invalid-email':
          message = 'Correo electrónico no válido.';
          break;
        case 'auth/user-disabled':
          message = 'Esta cuenta está deshabilitada.';
          break;
        case 'auth/too-many-requests':
          message = 'Demasiados intentos fallidos. Inténtalo de nuevo más tarde.';
          break;
        case 'auth/network-request-failed':
          message = 'Error de red. Revisa tu conexión.';
          break;
      }

      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    if (!auth) return;

    try {
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Logout failed:', err);
      setError('No se pudo cerrar sesión. Inténtalo de nuevo.');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};