import React from 'react';
import { Link } from 'react-router-dom';

export const SupportView: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8 font-medium">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Volver a Glimmind
        </Link>

        <div className="mb-10">
          <div className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
            Atención al Usuario & Soporte
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Centro de Soporte y Contacto
          </h1>
          <p className="text-slate-600 mt-2 text-lg">
            Estamos aquí para ayudarte a sacar el máximo provecho de tu aprendizaje y resolver cualquier incidencia.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Asistente interactivo en vivo */}
          <div className="bg-white rounded-2xl border-2 border-indigo-200 p-8 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-24 h-24 bg-indigo-50 rounded-full pointer-events-none" />
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-2xl mb-4 shadow-sm">
                💬
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Asistente Inteligente en Vivo
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Puedes interactuar de manera inmediata con nuestro <strong>asistente inteligente y widget de soporte</strong> ubicado en la esquina inferior de tu pantalla.
              </p>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">¿Para qué puedes usarlo?</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>Consultar dudas sobre tu progreso y mazos</li>
                  <li>Reportar errores o fallos en tiempo real</li>
                  <li>Enviar sugerencias directas al equipo de ingeniería</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Disponible 24/7 en la esquina inferior de tu pantalla
            </div>
          </div>

          {/* Contacto Directo por Correo */}
          <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center text-2xl mb-4">
                ✉️
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">
                Contacto por Correo Electrónico
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-4">
                Si requieres asistencia para cuentas corporativas, temas de facturación, o consultas legales y de privacidad:
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Soporte General:</div>
                  <a href="mailto:support@glimmind.com" className="text-indigo-600 font-semibold text-sm hover:underline">
                    support@glimmind.com
                  </a>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-xs text-slate-500 font-medium">Privacidad y GDPR:</div>
                  <a href="mailto:privacy@glimmind.com" className="text-indigo-600 font-semibold text-sm hover:underline">
                    privacy@glimmind.com
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-500">
              Tiempo estimado de respuesta: menos de 24 horas hábiles
            </div>
          </div>
        </div>

        {/* Recursos de autoayuda */}
        <div className="bg-slate-100/80 rounded-2xl p-6 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-900">¿Prefieres resolver tu duda de inmediato?</h3>
            <p className="text-sm text-slate-600">Revisa nuestras guías paso a paso y la sección de preguntas frecuentes.</p>
          </div>
          <div className="flex gap-3">
            <Link
              to="/docs"
              className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-50 transition"
            >
              Documentación
            </Link>
            <Link
              to="/faq"
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition"
            >
              Ver FAQ
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
};
