import React from 'react';

interface CustomCreationSectionProps {
  onCreateCustom: () => void;
}

export const CustomCreationSection: React.FC<CustomCreationSectionProps> = ({ onCreateCustom }) => {
  return (
    <div className="border-2 border-dashed border-indigo-200 bg-slate-50 rounded-2xl p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-1">🛠️ ¿Preferís cargar tu propio material?</h3>
      <p className="text-sm text-gray-500 mb-6">Creá tu propia lista con el método que prefieras.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <span className="text-2xl mb-2 block">📋</span>
          <p className="font-bold text-sm text-gray-900">CSV / Copiar y Pegar</p>
          <p className="text-xs text-gray-500 mt-1">Pegá desde Excel o Google Sheets</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 relative">
          <span className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">
            Popular
          </span>
          <span className="text-2xl mb-2 block">🤖</span>
          <p className="font-bold text-sm text-gray-900">Generar con IA</p>
          <p className="text-xs text-gray-500 mt-1">Creá listas por temas automáticamente</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <span className="text-2xl mb-2 block">✍️</span>
          <p className="font-bold text-sm text-gray-900">Carga Manual</p>
          <p className="text-xs text-gray-500 mt-1">Formulario directo término por término</p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onCreateCustom}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 active:scale-95 transition"
        >
          + Crear Lista Personalizada
        </button>
      </div>
    </div>
  );
};
