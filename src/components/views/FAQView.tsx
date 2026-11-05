import React, { useState } from 'react';
import { Link } from 'react-router-dom';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    category: 'Metodología y Algoritmo',
    question: '¿En qué se diferencia Glimmind de Anki o Quizlet?',
    answer: 'Glimmind no te obliga a calcular intervalos temporales subjetivos ni a lidiar con factores de facilidad complejos que castigan las rachas de estudio. Implementa una progresión visual de 4 ciclos cognitivos (Nueva → Vista → Reconocida → Frecuente) combinada con validación difusa de texto (Levenshtein) y práctica por voz interactiva.',
  },
  {
    category: 'Metodología y Algoritmo',
    question: '¿Qué es la validación difusa (Fuzzy Matching)?',
    answer: 'Es un algoritmo inteligente que evalúa tu respuesta escrita perdonando erratas menores, acentos o variaciones de puntuación según el umbral configurado (por ejemplo 95%). Si cometes un error de tipeo menor pero dominas la palabra, el sistema lo identifica para que no pierdas motivación innecesariamente.',
  },
  {
    category: 'Privacidad y Datos',
    question: '¿Funciona Glimmind de manera offline?',
    answer: 'Sí. Glimmind está diseñado con arquitectura Local-First. Todo tu progreso y tus mazos se almacenan de forma local en tu navegador mediante IndexedDB y localStorage. Puedes estudiar sin conexión a internet y, al recuperar la conexión, tus datos se sincronizan automáticamente con Firebase.',
  },
  {
    category: 'Privacidad y Datos',
    question: '¿Venden mis datos o grabaciones de voz a terceros?',
    answer: 'Absolutamente no. Tus datos personales y tarjetas nunca se venden a empresas de publicidad ni a intermediarios de datos. El reconocimiento de voz offline (Vosk) se procesa en tu dispositivo, y las peticiones de síntesis neuronal se autentican a través de Google Cloud bajo estrictos acuerdos de confidencialidad.',
  },
  {
    category: 'Cuentas y Planes',
    question: '¿Qué incluye la versión gratuita y cuándo necesito Premium?',
    answer: 'El plan gratuito permite crear hasta 1,000 tarjetas, sincronización en la nube con Google, y modos completos de examen y entrenamiento. El plan Premium eleva el límite a 5,000 tarjetas y desbloquea el generador inteligente de mazos con Google Gemini y voces neuronales de alta definición.',
  },
  {
    category: 'Cuentas y Planes',
    question: '¿Cómo puedo exportar o eliminar mis datos?',
    answer: 'Tienes el control total de tu información en cumplimiento con GDPR y normativas de privacidad. Desde Ajustes puedes exportar todos tus mazos en formato JSON o CSV en cualquier momento, o solicitar la eliminación total e irreversible de tu cuenta y registros con un solo clic.',
  },
];

export const FAQView: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

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
            Centro de Ayuda
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Preguntas Frecuentes (FAQ)
          </h1>
          <p className="text-slate-600 mt-2 text-lg">
            Respuestas claras sobre el funcionamiento, privacidad, sincronización y tecnología de Glimmind.
          </p>
        </div>

        <div className="space-y-4">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggle(idx)}
                  className="w-full text-left p-6 flex justify-between items-center gap-4 hover:bg-slate-50/50 transition-colors"
                  aria-expanded={isOpen}
                >
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                      {item.category}
                    </span>
                    <span className="text-lg font-bold text-slate-900">{item.question}</span>
                  </div>
                  <svg
                    className={`w-6 h-6 text-slate-400 shrink-0 transform transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-slate-600 leading-relaxed border-t border-slate-100 text-base">
                    {item.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-12 p-8 bg-indigo-50 rounded-2xl border border-indigo-100 text-center">
          <h3 className="text-lg font-bold text-slate-900 mb-2">¿Tienes alguna pregunta no listada aquí?</h3>
          <p className="text-sm text-slate-600 mb-4">
            Nuestro asistente interactivo en pantalla y nuestro equipo de soporte están listos para asistirte.
          </p>
          <Link
            to="/support"
            className="inline-flex items-center justify-center px-6 py-2.5 bg-indigo-600 text-white font-semibold text-sm rounded-xl shadow-xs hover:bg-indigo-700 transition"
          >
            Ir a Soporte y Contacto
          </Link>
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="text-indigo-600 hover:text-indigo-800 font-medium">← Volver al inicio</Link>
        </div>
      </div>
    </div>
  );
};
