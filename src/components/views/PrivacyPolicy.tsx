import React from 'react';
import { Link } from 'react-router-dom';

export const PrivacyPolicy: React.FC = () => (
  <div className="min-h-screen bg-slate-50">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8 font-medium">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver a Glimmind
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
          <span>🔒</span> Estándar de Seguridad y Cifrado Riguroso
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Política de Privacidad y Seguridad de Datos</h1>
        <p className="text-slate-500 mt-2">Última actualización: Noviembre 2026 | Versión 2.0 (Cumplimiento GDPR & Transparencia Criptográfica)</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8 shadow-xs">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>🛡️</span> 1. Principio Fundamental: Arquitectura Local-First y Zero-Data Selling
          </h2>
          <p className="text-slate-600 leading-relaxed mb-3">
            En Glimmind creemos que la privacidad no es una configuración secundaria, sino el núcleo de nuestra arquitectura:
          </p>
          <ul className="space-y-2 text-slate-600 list-disc list-inside">
            <li><strong>Tus datos son tuyos:</strong> Nunca vendemos, alquilamos ni comercializamos tu información personal, mazos o patrones de estudio con anunciantes ni corredores de datos (data brokers).</li>
            <li><strong>Local-First por diseño:</strong> La aplicación es plenamente funcional sin conexión. Tus mazos y progreso se guardan prioritariamente en tu propio dispositivo (IndexedDB y localStorage).</li>
            <li><strong>Sincronización voluntaria:</strong> La sincronización en la nube solo se activa si inicias sesión explícitamente mediante Google OAuth.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>🔐</span> 2. Seguridad Criptográfica y Residencia de Datos
          </h2>
          <p className="text-slate-600 leading-relaxed mb-4">
            Aplicamos controles técnicos rigurosos para salvaguardar la confidencialidad e integridad de tus datos:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Cifrado en Tránsito (TLS 1.3)</div>
              <p className="text-slate-600">
                Todas las comunicaciones entre tu navegador y nuestra infraestructura están forzadas mediante HTTPS con TLS 1.3 y directiva estricta HSTS (Strict-Transport-Security preloaded).
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Cifrado en Reposo (AES-256)</div>
              <p className="text-slate-600">
                Toda la información persistida en la nube (Firestore y Firebase Storage) se cifra automáticamente en reposo mediante el estándar militar AES-256 gestionado por Google Cloud Platform.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Aislamiento de Sesión y CSP</div>
              <p className="text-slate-600">
                Cabeceras Content Security Policy (CSP) estrictas, X-Frame-Options: DENY (anti-clickjacking) y bloqueo de sniffing (nosniff) para prevenir vulnerabilidades XSS e inyecciones.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div className="font-bold text-slate-900 mb-1">Procesamiento de Voz Local</div>
              <p className="text-slate-600">
                El reconocimiento de voz con modelo Vosk corre completamente en el navegador del usuario vía WebAssembly, sin enviar audio crudo a ningún servidor externo.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>📋</span> 3. Información que Recopilamos
          </h2>
          <ul className="space-y-3 text-slate-600 text-sm">
            <li><strong>Datos de autenticación:</strong> Correo electrónico y nombre público provistos por Google OAuth (únicamente al iniciar sesión).</li>
            <li><strong>Contenido educativo:</strong> Palabras, asociaciones, definiciones y notas que tú creas o importas en tus listas.</li>
            <li><strong>Métricas de progreso cognitivo:</strong> Ciclos de retención (Nueva, Vista, Reconocida, Frecuente), tiempos de respuesta y estadísticas de acierto para el algoritmo de repaso.</li>
            <li><strong>Telemetría y fallos técnicos:</strong> Registros sanitizados de errores que no contienen contraseñas, tokens de autenticación ni información privada personal.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>🇪🇺</span> 4. Derechos del Usuario y Cumplimiento GDPR
          </h2>
          <p className="text-slate-600 mb-4">
            En cumplimiento del Reglamento General de Protección de Datos (GDPR) de la Unión Europea y leyes internacionales de privacidad, garantizamos tus derechos:
          </p>
          <div className="space-y-2 text-sm text-slate-600">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong>Derecho de Acceso y Portabilidad:</strong> Puedes descargar en cualquier momento una copia íntegra de todos tus mazos y estadísticas en formato JSON o CSV desde Ajustes.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong>Derecho de Supresión (Derecho al Olvido):</strong> Puedes solicitar la eliminación total e inmediata de tu cuenta y todos los registros asociados en Ajustes → Eliminar Cuenta.
            </div>
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
              <strong>Derecho de Rectificación:</strong> Puedes modificar cualquier dato o tarjeta al instante desde el editor de mazos.
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>🤝</span> 5. Proveedores de Infraestructura Autorizados
          </h2>
          <p className="text-slate-600 text-sm mb-3">
            Únicamente contratamos proveedores de infraestructura de primer nivel que cumplen con certificaciones ISO 27001, SOC 2 y acuerdos de procesamiento de datos:
          </p>
          <ul className="space-y-2 text-slate-600 text-sm list-disc list-inside">
            <li><strong>Google Cloud & Firebase:</strong> Almacenamiento seguro, autenticación y despliegue global bajo centros de datos certificados.</li>
            <li><strong>Stripe:</strong> Pasarela de pago segura con cumplimiento PCI-DSS Nivel 1 para suscripciones Premium (Glimmind nunca almacena datos de tarjetas de crédito).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>📬</span> 6. Contacto y Delegado de Protección de Datos
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Para ejercer tus derechos de privacidad, presentar una consulta o reportar un incidente de seguridad, contacta a nuestro equipo de privacidad en:{' '}
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
