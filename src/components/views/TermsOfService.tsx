import React from 'react';
import { Link } from 'react-router-dom';

export const TermsOfService: React.FC = () => (
  <div className="min-h-screen bg-slate-50">
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Link to="/" className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 mb-8 font-medium">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Volver a Glimmind
      </Link>

      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold rounded-full uppercase tracking-wider mb-3">
          <span>⚖️</span> Marco de Términos y Condiciones
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">Términos de Servicio</h1>
        <p className="text-slate-500 mt-2">Última actualización: Noviembre 2026 | Versión 2.0</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8 shadow-xs">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">1. Aceptación de los Términos</h2>
          <p className="text-slate-600 leading-relaxed">
            Al acceder y utilizar Glimmind en la web o en aplicaciones móviles (iOS/Android), aceptas estar sujeto a los presentes Términos de Servicio y a nuestra Política de Privacidad. Si no estás de acuerdo con alguna de estas condiciones, debes abstenerte de utilizar la plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">2. Propiedad Intelectual y Contenido del Usuario</h2>
          <p className="text-slate-600 leading-relaxed mb-3">
            <strong>Tus tarjetas te pertenecen:</strong> Conservas todos los derechos de propiedad intelectual sobre el vocabulario, notas, listas y materiales que crees o importes en Glimmind. Nos concedes únicamente una licencia limitada, revocable y no exclusiva estrictamente necesaria para almacenar, sincronizar y procesar tus tarjetas para tu propio uso.
          </p>
          <p className="text-slate-600 leading-relaxed">
            El motor de evaluación, algoritmos de progresión de 4 ciclos, código fuente de interfaz, marcas y logotipos son propiedad exclusiva de Glimmind.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">3. Uso Aceptable y Seguridad</h2>
          <p className="text-slate-600 leading-relaxed mb-3">
            Te comprometes a utilizar la plataforma conforme a la legalidad y a no realizar acciones que puedan comprometer la seguridad o disponibilidad del servicio:
          </p>
          <ul className="space-y-2 text-slate-600 list-disc list-inside text-sm">
            <li>No intentar eludir los límites de cuota, autenticación o medidas de seguridad implementadas.</li>
            <li>No utilizar procesos automatizados abusivos (scrapers o bots no autorizados) que degraden el servicio para otros usuarios.</li>
            <li>No introducir malware ni ejecutar ataques de denegación de servicio.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">4. Planes, Cuotas y Suscripciones Premium</h2>
          <p className="text-slate-600 leading-relaxed mb-3">
            Glimmind ofrece una modalidad gratuita y opciones Premium con capacidades ampliadas:
          </p>
          <ul className="space-y-2 text-slate-600 list-disc list-inside text-sm">
            <li><strong>Plan Free:</strong> Límite de hasta 1,000 tarjetas, sincronización en la nube con Google y modos completos de estudio.</li>
            <li><strong>Plan Premium:</strong> Límite ampliado a 5,000 tarjetas, generación inteligente con IA y voces de alta fidelidad. Los pagos son procesados de forma segura a través de Stripe con cifrado bancario.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">5. Disponibilidad y Garantías</h2>
          <p className="text-slate-600 leading-relaxed">
            Glimmind se proporciona "tal cual" y "según disponibilidad". Gracias a nuestra arquitectura Local-First, la mayor parte de las funciones operan ininterrumpidamente sin conexión a internet. Nos esforzamos continuamente por mantener un tiempo de actividad (uptime) superior al 99.9% en nuestros servicios en la nube.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">6. Cancelación y Eliminación de Cuentas</h2>
          <p className="text-slate-600 leading-relaxed">
            Puedes cancelar tu cuenta y eliminar todos tus datos en cualquier momento desde la sección de Ajustes. La eliminación es definitiva y purga tus registros de nuestra base de datos en la nube de conformidad con las directrices GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3">7. Contacto Legal</h2>
          <p className="text-slate-600">
            Para cualquier consulta sobre estos Términos, comunícate con nosotros en{' '}
            <a href="mailto:support@glimmind.com" className="text-indigo-600 font-semibold hover:underline">
              support@glimmind.com
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
