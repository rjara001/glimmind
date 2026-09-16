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
import type { AppUser } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
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
          setUser(mapFirebaseUser(firebaseUser));
        } else {
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
      setError('Firebase auth not initialized');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      setUser(mapFirebaseUser(result.user));
    } catch (err) {
      const authError = err as AuthError;
      let message = 'Login failed. Please try again.';

      switch (authError.code) {
        case 'auth/user-not-found':
          message = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          message = 'Invalid email address.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/network-request-failed':
          message = 'Network error. Please check your connection.';
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
      setError('Failed to sign out. Please try again.');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError }}>
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