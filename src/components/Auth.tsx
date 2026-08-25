
import React, { useState } from 'react';
import { auth, googleProvider, signInWithPopup, signInWithRedirect, isConfigured } from '../firebase';
import { useToast } from './layout/Toast';

interface AuthProps {
  onLoginDev: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginDev }) => {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { showToast } = useToast();

  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      showToast('Firebase is not configured correctly.', 'error');
      return;
    }
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };

      if (err?.message?.includes('Cross-Origin-Opener-Policy')) {
        return;
      }

      if (err?.code === 'auth/popup-blocked' || err?.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch {
          showToast('Could not redirect to Google. Please try again.', 'error');
          setIsLoggingIn(false);
          return;
        }
      }

      if (err?.code === 'auth/popup-closed-by-user') {
        setIsLoggingIn(false);
        return;
      }

      showToast('Google login failed. Please try again.', 'error');
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="mb-10">
          <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-100 mb-5">
             <svg className="w-11 h-11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9" />
                <path d="M12 21c4.97 0 9-4.03 9-9" opacity="0.4" />
                <path d="M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0" />
                <path d="M12 3v2" />
                <path d="M12 19v2" />
                <path d="M3 12h2" />
                <path d="M19 12h2" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-1.5 tracking-tight">Glimmind</h1>
          <p className="text-slate-500 font-medium text-sm">Learn smarter with spaced repetition</p>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100">
          <button 
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-3.5 px-4 rounded-xl font-bold text-slate-700 hover:bg-slate-50 hover:border-indigo-100 transition shadow-sm mb-3 disabled:opacity-60"
          >
            {isLoggingIn ? (
              <>
                <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                <span>Sign in with Google</span>
              </>
            )}
          </button>
          
          <button 
            onClick={onLoginDev}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-2 bg-slate-50 text-slate-600 py-3.5 px-4 rounded-xl font-bold hover:bg-slate-100 transition border border-slate-200 disabled:opacity-60"
          >
            Continue as Guest
          </button>
          
          <p className="text-[10px] text-slate-400 mt-6 font-bold uppercase tracking-widest leading-relaxed">
            Data saved locally in guest mode
          </p>
        </div>
      </div>
    </div>
  );
};
