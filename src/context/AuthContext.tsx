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
import i18n from '../i18n';
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
      setError(i18n.t('auth.autenticacion_de_firebase_no_inicializada'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(mapFirebaseUser(result.user));
    } catch (err) {
      const authError = err as AuthError;
      let message = i18n.t('auth.no_se_pudo_iniciar_sesion_intentalo_de_nue');

      switch (authError.code) {
        case 'auth/user-not-found':
          message = i18n.t('auth.no_hay_ninguna_cuenta_con_este_correo');
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = i18n.t('auth.correo_o_contrasena_incorrectos');
          break;
        case 'auth/invalid-email':
          message = i18n.t('auth.correo_electronico_no_valido');
          break;
        case 'auth/user-disabled':
          message = i18n.t('auth.esta_cuenta_esta_deshabilitada');
          break;
        case 'auth/too-many-requests':
          message = i18n.t('auth.demasiados_intentos_fallidos_intentalo_de_');
          break;
        case 'auth/network-request-failed':
          message = i18n.t('auth.error_de_red_revisa_tu_conexion');
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
      setError(i18n.t('auth.no_se_pudo_cerrar_sesion_intentalo_de_nuevo'));
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
    throw new Error(i18n.t('auth.useauth_must_be_used_within_an_authprovide'));
  }
  return context;
};