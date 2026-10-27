import React from 'react';
import { useTranslation } from 'react-i18next';

interface CustomCreationSectionProps {
  onCreateCustom: () => void;
}

export const CustomCreationSection: React.FC<CustomCreationSectionProps> = ({ onCreateCustom }) => {
  const { t } = useTranslation('onboarding');

  return (
    <div className="border-2 border-dashed border-indigo-200 bg-slate-50 rounded-2xl p-8">
      <h3 className="text-xl font-bold text-gray-900 mb-1">{t('prefieres_cargar_tu_propio_material')}</h3>
      <p className="text-sm text-gray-500 mb-6">{t('crea_tu_propia_lista_con_el_metodo_que_prefieras')}</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <span className="text-2xl mb-2 block">📋</span>
          <p className="font-bold text-sm text-gray-900">{t('csv_copiar_y_pegar')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('pega_desde_excel_o_google_sheets')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 relative">
          <span className="absolute top-3 right-3 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase px-2 py-0.5 rounded">
            {t('popular')}
          </span>
          <span className="text-2xl mb-2 block">🤖</span>
          <p className="font-bold text-sm text-gray-900">{t('generar_con_ia')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('crea_listas_por_temas_automaticamente')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <span className="text-2xl mb-2 block">✍️</span>
          <p className="font-bold text-sm text-gray-900">{t('carga_manual')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('formulario_directo_termino_por_termino')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <span className="text-2xl mb-2 block">📺</span>
          <p className="font-bold text-sm text-gray-900">{t('desde_youtube')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('pega_una_url_y_generamos_vocabulario_automaticamente')}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <span className="text-2xl mb-2 block">📝</span>
          <p className="font-bold text-sm text-gray-900">{t('texto_libre')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('pega_un_articulo_transcripcion_o_texto_y_generamos_vocabulario_automaticamente')}</p>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onCreateCustom}
          className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 active:scale-95 transition"
        >
          {t('crear_lista_personalizada')}
        </button>
      </div>
    </div>
  );
};
