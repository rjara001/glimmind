import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { useToast } from './Toast';
import { userService } from '../services/userService';

interface SettingsViewProps {
  onBack: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBack }) => {
  const settings = useGameStore((state) => state.settings);
  const setSettings = useGameStore((state) => state.setSettings);
  const user = useGameStore((state) => state.user);
  const quota = useGameStore((state) => state.quota);
  const loadQuota = useGameStore((state) => state.loadQuota);
  const { showToast } = useToast();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.uid && user.uid !== 'dev-user-local') {
      loadQuota();
    }
  }, [user?.uid, loadQuota]);

  useEffect(() => {
    setIsPremium(quota?.tier === 'premium');
  }, [quota?.tier]);

  const handleToggleHistory = () => {
    setSettings({ ...settings, activityHistoryEnabled: !settings.activityHistoryEnabled });
  };

  const handleTogglePremium = async () => {
    if (!user?.uid || user.uid === 'dev-user-local') {
      showToast('Inicia sesión para cambiar el estado premium.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const result = await userService.setPremium(user.uid);
      if (result.success) {
        await loadQuota();
        const updatedQuota = useGameStore.getState().quota;
        const isPremiumNow = updatedQuota?.tier === 'premium';
        setIsPremium(isPremiumNow);
        showToast(isPremiumNow ? '¡Ahora eres premium!' : 'Estado actualizado.', 'success');
      } else {
        showToast('No se pudo actualizar el estado premium.', 'error');
      }
    } catch (error) {
      showToast('Error al actualizar premium.', 'error');
    } finally {
      setIsLoading(false);
    }
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
                Activo. A partir de ahora se registra la actividad de tus tarjetas y las vistas
                de Actividad, Resumen de juegos y Ranking estarán disponibles.
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
            <h3 className="font-bold text-gray-900">Premium</h3>
            <p className="text-sm text-gray-500 mt-1">
              {isPremium
                ? 'Disfrutás de límites ampliados: 5000 tarjetas y 10 usos diarios de IA.'
                : 'Activá premium para desbloquear 5000 tarjetas y 10 usos diarios de IA.'}
            </p>
            {quota && (
              <p className="text-xs text-gray-400 mt-2">
                Estado actual: <span className={`font-bold ${isPremium ? 'text-emerald-600' : 'text-slate-500'}`}>{isPremium ? 'Premium' : 'Free'}</span>
                {' '}· Tarjetas: {quota.cardCount}/{quota.cardQuota} · IA: {quota.aiUsedToday}/{quota.aiQuotaDaily}
              </p>
            )}
          </div>
          <button
            role="switch"
            aria-checked={isPremium}
            aria-label="Modo premium"
            onClick={handleTogglePremium}
            disabled={isLoading}
            className={`relative inline-flex flex-shrink-0 h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
              isPremium ? 'bg-indigo-600' : 'bg-slate-200'
            } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                isPremium ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
