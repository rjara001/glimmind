
import React from 'react';
import { auth, googleProvider, signInWithPopup, isConfigured } from '../firebase';

interface AuthProps {
  onLoginDev: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onLoginDev }) => {
  const handleGoogleLogin = async () => {
    if (!isConfigured) {
      alert("Firebase no está configurado. Usa el 'Modo Desarrollador' para probar la app localmente.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Error al iniciar sesión. Revisa la configuración de Firebase.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black mx-auto shadow-xl mb-4">G</div>
          <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">Glimmind</h1>
          <p className="text-gray-500">Domina cualquier asociación de palabras.</p>
        </div>
        
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
          <button 
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 px-4 rounded-xl font-bold text-gray-700 hover:bg-gray-50 transition shadow-sm mb-4"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
            Continuar con Google
          </button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-400">O prueba la app ahora</span></div>
          </div>

          <button 
            onClick={onLoginDev}
            className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 py-3 px-4 rounded-xl font-bold hover:bg-indigo-100 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Entrar como Invitado (Modo Dev)
          </button>

          <p className="text-xs text-gray-400 mt-6">
            El modo invitado guarda tus datos localmente en este navegador.
          </p>
        </div>
      </div>
    </div>
  );
};
