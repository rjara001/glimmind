import React from 'react';
import { Link } from 'react-router-dom';

export const CookiePolicy: React.FC = () => (
  <div className="min-h-screen bg-slate-50">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8 font-medium">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver a Glimmind
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
          <span>🍪</span> Transparencia y Política Zero-Tracker
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Política de Cookies y Almacenamiento Local</h1>
        <p className="text-slate-500 mt-2">Última actualización: Noviembre 2026</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8 shadow-xs">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Compromiso Anti-Rastreo (Zero Tracking Cookies)</h2>
          <p className="text-slate-600 leading-relaxed">
            En Glimmind <strong>no utilizamos cookies de rastreo publicitario, cookies de marketing cruzado ni perfiles de comportamiento</strong>. Solo empleamos almacenamiento estrictamente necesario para la autenticación de tu sesión y la persistencia de tus sesiones de estudio en tu dispositivo.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4">2. Detalle de Almacenamiento Técnico</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70">
                  <th className="py-3 px-4 font-bold text-slate-900">Identificador</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Tipo</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Finalidad</th>
                  <th className="py-3 px-4 font-bold text-slate-900">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-3 px-4 font-mono text-slate-700 text-xs">firebaseAuthToken</td>
                  <td className="py-3 px-4 text-slate-600">Cookie / Storage Seguro</td>
                  <td className="py-3 px-4 text-slate-600">Mantener la sesión autenticada con Google</td>
                  <td className="py-3 px-4 text-slate-600">Sesión (renovación segura)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-slate-700 text-xs">glimmind_lists</td>
                  <td className="py-3 px-4 text-slate-600">IndexedDB / localStorage</td>
                  <td className="py-3 px-4 text-slate-600">Almacenar tus tarjetas y mazos localmente</td>
                  <td className="py-3 px-4 text-slate-600">Persistente (controlado por el usuario)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-slate-700 text-xs">glimmind_progress</td>
                  <td className="py-3 px-4 text-slate-600">IndexedDB / localStorage</td>
                  <td className="py-3 px-4 text-slate-600">Guardar el estado de los 4 ciclos y repasos</td>
                  <td className="py-3 px-4 text-slate-600">Persistente (controlado por el usuario)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-mono text-slate-700 text-xs">i18nextLng</td>
                  <td className="py-3 px-4 text-slate-600">localStorage</td>
                  <td className="py-3 px-4 text-slate-600">Recordar el idioma de interfaz preferido</td>
                  <td className="py-3 px-4 text-slate-600">Persistente</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Almacenamiento Local (Local-First Architecture)</h2>
          <p className="text-slate-600 leading-relaxed mb-3">
            El 95% de la interacción de datos ocurre directamente en tu navegador (IndexedDB y localStorage). Esto te permite utilizar la herramienta sin depender de una conexión activa a servidores remotos y reduce la huella de datos transferida por la red.
          </p>
          <p className="text-slate-600 leading-relaxed">
            Puedes purgar o reiniciar los datos almacenados localmente en cualquier momento a través de la sección de Ajustes de la aplicación.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Cómo Administrar o Desactivar Almacenamiento</h2>
          <p className="text-slate-600 leading-relaxed mb-3">
            Puedes configurar tu navegador web para rechazar cookies o borrar el almacenamiento local. Ten en cuenta que si desactivas el almacenamiento local, no podrás guardar el progreso de tus tarjetas en modo desconectado ni mantener tu sesión iniciada entre visitas.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Contacto</h2>
          <p className="text-slate-600">
            Si tienes dudas sobre el tratamiento de cookies y datos técnicos, escríbenos a{' '}
            <a href="mailto:privacy@glimmind.com" className="text-indigo-600 font-semibold hover:underline">
              privacy@glimmind.com
            </a>
          </p>
        </section>
      </div>

      <div className="mt-8 text-center">
        <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Volver a Glimmind</Link>
      </div>
    </div>
  </div>
);
