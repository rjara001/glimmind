import React, { useEffect } from 'react';
import { useGameStore } from '../../store/gameStore';
import { isFeatureEnabled } from '../../constants/featureFlags';
import { GUEST_UID } from '../../constants/app';

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const settings = useGameStore((state) => state.settings);
  const setSettings = useGameStore((state) => state.setSettings);
  const user = useGameStore((state) => state.user);
  const loadQuota = useGameStore((state) => state.loadQuota);

  useEffect(() => {
    if (user?.uid && user.uid !== GUEST_UID) {
      loadQuota();
    }
  }, [user?.uid, loadQuota]);

  const handleToggleHistory = () => {
    setSettings({ ...settings, activityHistoryEnabled: !settings.activityHistoryEnabled });
  };

  const handleToggleAudioRecording = () => {
    setSettings({ ...settings, audioRecordingEnabled: !settings.audioRecordingEnabled });
  };

  const handleToggleFallback = () => {
    setSettings({ ...settings, voiceSttFallback: !settings.voiceSttFallback });
  };

  const handleMaxCardsChange = (value: number) => {
    setSettings({ ...settings, maxCardsPerDeck: value });
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          aria-label="Volver"
          className="text-gray-400 hover:text-indigo-600 transition p-2 hover:bg-white rounded-full"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configuración</h2>
          <p className="text-sm text-gray-500">Preferencias generales de tu entorno.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Registro de historial</h3>
            <p className="text-sm text-gray-500 mt-1">
              Registra la actividad de tus tarjetas: movimientos entre listas, ediciones de
              valor1/valor2 y el avance en los niveles del juego (nueva, vista, reconocida,
              conocida, aprendida).
            </p>
            {settings.activityHistoryEnabled ? (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                {isFeatureEnabled('reports') ? (
                  <>
                    Activo. A partir de ahora se registra la actividad de tus tarjetas y las
                    vistas de Actividad, Resumen de juegos y Ranking estarán disponibles.
                  </>
                ) : (
                  <>
                    Activo. Se registra la actividad de tus tarjetas y la vista de Actividad
                    estará disponible.
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                Desactivado por defecto. Tus tarjetas no registran actividad ni contadores de
                partidas.
              </p>
            )}
          </div>
          <button
            role="switch"
            aria-checked={settings.activityHistoryEnabled}
            aria-label="Registro de historial"
            onClick={handleToggleHistory}
            className={`relative inline-flex flex-shrink-0 h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.activityHistoryEnabled ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                settings.activityHistoryEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-4">
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Grabación de audio</h3>
            <p className="text-sm text-gray-500 mt-1">
              Guarda los audios de tus intentos en modo voz, separados por acierto y error.
              Temporal: los archivos se eliminan automáticamente.
            </p>
            {settings.audioRecordingEnabled ? (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Activo. Las grabaciones se suben a la nube y se eliminan en forma automática.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                Desactivado por defecto. No se guardan audios.
              </p>
            )}
          </div>
          <button
            role="switch"
            aria-checked={settings.audioRecordingEnabled}
            aria-label="Grabación de audio"
            onClick={handleToggleAudioRecording}
            className={`relative inline-flex flex-shrink-0 h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.audioRecordingEnabled ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                settings.audioRecordingEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-4">
        <div className="p-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900">Fallback de reconocimiento de voz</h3>
            <p className="text-sm text-gray-500 mt-1">
              Si el reconocimiento del navegador falla hasta 3 veces seguidas, se activa
              automáticamente un reconocimiento externo para intentar leer tu respuesta.
            </p>
            {settings.voiceSttFallback ? (
              <p className="text-xs text-amber-600 mt-2 font-medium">
                Activo. Tenés hasta 3 intentos antes de que se intente el reconocimiento externo.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                Desactivado por defecto. Si fallás el reconocimiento del navegador, la respuesta
                se considera incorrecta sin intentos adicionales.
              </p>
            )}
          </div>
          <button
            role="switch"
            aria-checked={settings.voiceSttFallback}
            aria-label="Fallback de reconocimiento de voz"
            onClick={handleToggleFallback}
            className={`relative inline-flex flex-shrink-0 h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              settings.voiceSttFallback ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                settings.voiceSttFallback ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-4">
        <div className="p-6">
          <h3 className="font-bold text-gray-900">Máximo de tarjetas por mazo</h3>
          <p className="text-sm text-gray-500 mt-1">
            Al importar texto, CSV o YouTube, si superás este límite se dividirá
            automáticamente en varios mazos.
          </p>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[100, 300, 700, 1000].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => handleMaxCardsChange(option)}
                className={`py-2 rounded-xl border text-sm font-semibold transition ${
                  settings.maxCardsPerDeck === option
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 bg-white text-gray-700 hover:border-indigo-300'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Valor actual: <span className="font-bold">{settings.maxCardsPerDeck}</span> tarjetas por mazo
          </p>
        </div>
      </div>
    </div>
  );
};
