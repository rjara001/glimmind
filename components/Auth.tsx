
import React from 'react';
import { auth, googleProvider, signInWithPopup, isConfigured } from '../firebase';

interface AuthProps {
  onLoginDev: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginDev }) => {
  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      alert("Firebase no está configurado correctamente.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-12">
          <div className="w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center text-white mx-auto shadow-2xl shadow-indigo-100 mb-6 group hover:rotate-6 transition-transform">
             <svg className="w-14 h-14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21c-4.97 0-9-4.03-9-9s4.03-9 9-9 9 4.03 9 9" />
                <path d="M12 21c4.97 0 9-4.03 9-9" opacity="0.4" />
                <path d="M9 12a3 3 0 1 0 6 0 3 3 0 1 0-6 0" />
                <path d="M12 3v2" />
                <path d="M12 19v2" />
                <path d="M3 12h2" />
                <path d="M19 12h2" />
            </svg>
          </div>
          <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">Glimmind</h1>
          <p className="text-slate-500 font-medium italic">"Flashcards con esteroides para tu cerebro"</p>
        </div>
        
        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-slate-100 py-4 px-4 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 hover:border-indigo-100 transition shadow-sm mb-4"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Iniciar con Google
          </button>
          
          <button 
            onClick={onLoginDev}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-4 px-4 rounded-2xl font-bold hover:bg-indigo-100 transition"
          >
            Acceso Local (Modo Invitado)
          </button>
          
          <p className="text-[10px] text-slate-400 mt-8 font-black uppercase tracking-widest leading-relaxed">
            Memorización por ciclos de 4 etapas
          </p>
        </div>
      </div>
    </div>
  );
};
