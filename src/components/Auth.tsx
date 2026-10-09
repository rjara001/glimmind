import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
    <div className="min-h-screen flex items-center justify-center px-6 py-6 relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 20% 20%, rgba(99, 102, 241, 0.06) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(219, 39, 119, 0.05) 0%, transparent 40%)'
      }} />

      <div className="relative z-10 w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="w-[130px] h-[130px] mx-auto mb-4 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#4f46e5" />
                  <stop offset="100%" stopColor="#7c3aed" />
                </linearGradient>
              </defs>
              <rect width="100" height="100" rx="24" fill="url(#logoGrad)" />
              <text x="50" y="68" textAnchor="middle" fill="white" fontSize="52" fontWeight="800" fontFamily="Inter, -apple-system, sans-serif">G</text>
            </svg>
          </div>
          <h1 className="text-[1.9rem] font-extrabold tracking-tight text-slate-900 mb-1.5">Glimmind</h1>
          <p className="text-[0.85rem] text-slate-500 font-medium">Recuerda lo que aprendes, no solo lo practicas.</p>
        </div>

        <div className="bg-white rounded-[20px] p-8 border border-slate-200 shadow-xl shadow-slate-900/5">
          <h2 className="text-[1.05rem] font-bold text-slate-900 text-center mb-1">Empezar</h2>
          <p className="text-[0.8rem] text-slate-500 text-center mb-7">Elige cómo quieres entrar</p>

          <div className="flex flex-col gap-3 mb-6">
            <button
              onClick={handleGoogleLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl text-[0.9rem] font-semibold bg-white text-slate-900 border-2 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 hover:-translate-y-px hover:shadow-lg hover:shadow-indigo-500/10 transition-all disabled:opacity-60"
            >
              {isLoggingIn ? (
                <>
                  <svg className="w-5 h-5 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Conectando...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>

            <button
              onClick={onLoginDev}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-xl text-[0.9rem] font-semibold bg-slate-900 text-white border-2 border-slate-900 hover:bg-slate-800 hover:border-slate-800 hover:-translate-y-px hover:shadow-lg hover:shadow-slate-900/20 transition-all disabled:opacity-60"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M4 21v-1a6 6 0 016-6h4a6 6 0 016 6v1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Continuar como invitado</span>
            </button>
          </div>

          <div className="bg-indigo-50/50 border border-slate-200 rounded-[10px] p-3 flex gap-2.5 items-start mb-5">
            <span className="text-indigo-500 text-sm leading-relaxed flex-shrink-0">💡</span>
            <p className="text-[0.72rem] text-slate-500 leading-relaxed">
              <strong className="text-slate-900 font-semibold">Modo invitado:</strong> tus datos se guardan solo en tu dispositivo.{' '}
              <strong className="text-slate-900 font-semibold">Google:</strong> sincroniza entre todos tus dispositivos.
            </p>
          </div>

          <p className="text-center text-[0.72rem] text-slate-400 leading-relaxed">
            Al continuar, aceptas nuestros{' '}
            <a href="/terms" className="text-indigo-500 hover:underline font-medium">Términos</a> y{' '}
            <a href="/privacy" className="text-indigo-500 hover:underline font-medium">Política de Privacidad</a>.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-[0.8rem] text-slate-500 hover:text-slate-900 font-medium transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};
