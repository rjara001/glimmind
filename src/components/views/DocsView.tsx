import React from 'react';
import { Link } from 'react-router-dom';

export const DocsView: React.FC = () => {
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
            Guía y Referencia Técnica
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Documentación de Glimmind
          </h1>
          <p className="text-slate-600 mt-2 text-lg">
            Aprende cómo funciona el motor de repetición espaciada de 4 ciclos, los modos de evaluación y las capacidades avanzadas de voz e inteligencia artificial.
          </p>
        </div>

        <div className="space-y-8">
          {/* Ciclos */}
          <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">1</span>
              El Sistema de los 4 Ciclos
            </h2>
            <p className="text-slate-600 mb-6 leading-relaxed">
              A diferencia de las flashcards convencionales con intervalos fijos arbitrarios, Glimmind estructura la retención en cuatro estados cognitivos medibles y visibles:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-blue-600 mb-1">Ciclo 1</div>
                <div className="font-bold text-slate-900 mb-1">Nueva (Descubrimiento)</div>
                <p className="text-sm text-slate-600">Primer contacto con el término y su significado en contexto.</p>
              </div>
              <div className="p-4 rounded-xl border border-amber-100 bg-amber-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-600 mb-1">Ciclo 2</div>
                <div className="font-bold text-slate-900 mb-1">Vista (Reconocimiento inicial)</div>
                <p className="text-sm text-slate-600">Asociación guiada y recuperación temprana de la memoria a corto plazo.</p>
              </div>
              <div className="p-4 rounded-xl border border-pink-100 bg-pink-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-pink-600 mb-1">Ciclo 3</div>
                <div className="font-bold text-slate-900 mb-1">Reconocida (Consolidación)</div>
                <p className="text-sm text-slate-600">Validación con respuestas activas y menor dependencia de pistas.</p>
              </div>
              <div className="p-4 rounded-xl border border-purple-100 bg-purple-50/50">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-1">Ciclo 4</div>
                <div className="font-bold text-slate-900 mb-1">Frecuente (Dominio activo)</div>
                <p className="text-sm text-slate-600">Evocación instantánea y fluida sin errores repetidos.</p>
              </div>
            </div>
            <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
              <strong className="text-slate-900">Regla de progresión:</strong> Cada acierto promueve la tarjeta al siguiente ciclo. Un error en un ciclo avanzado la regresa al ciclo anterior de consolidación, asegurando que ninguna brecha de conocimiento pase desapercibida.
            </div>
          </section>

          {/* Modos de Juego */}
          <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">2</span>
              Modos de Estudio: Examen vs. Entrenamiento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span>🎯</span> Modo Examen (Real)
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Requiere escritura activa o dictado por voz de la respuesta exacta.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li>Evaluación mediante algoritmo de distancia Levenshtein configurable (tolerancia a tildes o pequeñas erratas tipográficas).</li>
                  <li>Ideal para comprobar la memoria productiva y prepararse para exámenes o entornos profesionales.</li>
                </ul>
              </div>

              <div className="border border-slate-200 rounded-xl p-5 bg-white">
                <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <span>⚡</span> Modo Entrenamiento (Training)
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Enfocado en la auto-evaluación rápida mediante revelación de respuesta.
                </p>
                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                  <li>El usuario evalúa mentalmente y presiona "Correcto" o "Pasar" tras voltear la tarjeta.</li>
                  <li>Recomendado para sesiones intensivas de repaso con gran volumen de vocabulario.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Voz y Speech Recognition */}
          <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">3</span>
              Tecnología de Voz y Reconocimiento Híbrido
            </h2>
            <p className="text-slate-600 mb-4 leading-relaxed">
              Glimmind cuenta con un motor de audio de doble capa adaptativo:
            </p>
            <ul className="space-y-3 text-slate-600 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span><strong>Reconocimiento Offline (Vosk):</strong> Permite practicar pronunciación y dictar respuestas completamente en el navegador sin enviar grabaciones a servidores externos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span><strong>Síntesis de Alta Definición (Chirp 3 HD):</strong> Voces neuronales naturales que reproducen la entonación y acentos nativos de cada idioma objetivo.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold">✓</span>
                <span><strong>Web Speech API:</strong> Soporte nativo para navegadores móviles y de escritorio como opción rápida sin dependencias.</span>
              </li>
            </ul>
          </section>

          {/* Atajos de teclado */}
          <section className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-black">4</span>
              Atajos de Teclado para Estudio Ágil
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">Revelar respuesta</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono text-xs">Espacio</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">Marcar Correcto</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono text-xs">1 / C</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">Pasar / Incorrecto</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono text-xs">2 / P</kbd>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-slate-700">Escuchar pronunciación</span>
                <kbd className="px-2 py-1 bg-white border border-slate-300 rounded shadow-xs font-mono text-xs">L</kbd>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-12 text-center">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
};
