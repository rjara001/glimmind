import React, { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import { isFeatureEnabled } from '../../constants/featureFlags';
import { GUEST_UID } from '../../constants/app';
import { useToast } from '../layout/Toast';
import { stripeService } from '../../services/stripe';
import {
  PREMIUM_CHECKOUT_CANCELED_VALUE,
  PREMIUM_CHECKOUT_CANCEL_URL,
  PREMIUM_CHECKOUT_SUCCESS_PARAM,
  PREMIUM_CHECKOUT_SUCCESS_URL,
  PREMIUM_CHECKOUT_SUCCESS_VALUE,
  PREMIUM_POLL_INTERVAL_MS,
  PREMIUM_POLL_TIMEOUT_MS,
  PREMIUM_TOAST_ALREADY_PREMIUM,
  PREMIUM_TOAST_CHECKOUT_CANCELED,
  PREMIUM_TOAST_CHECKOUT_ERROR,
  PREMIUM_TOAST_GUARD,
  PREMIUM_TOAST_PENDING,
  PREMIUM_TOAST_UPGRADED,
} from '../../constants/premium';
import type { PremiumUpgradeOutcome } from '../../types/premium';

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
  const [searchParams, setSearchParams] = useSearchParams();

  const isGuest = user?.uid === GUEST_UID;
  const isPremium = quota?.tier === 'premium';
  // Only the pending-quota state blocks the button. Guests keep it enabled so
  // clicking explains why they cannot upgrade yet.
  const isCheckoutPending = !user || quota === null;

  // Stripe redirects back to /settings?upgrade=success|canceled. Captured once at
  // mount so the two effects below cannot disagree, and so the param is consumed
  // exactly once no matter how often the component re-renders.
  const [upgradeOutcome] = useState<PremiumUpgradeOutcome | null>(() => {
    const raw = searchParams.get(PREMIUM_CHECKOUT_SUCCESS_PARAM);
    if (raw === PREMIUM_CHECKOUT_SUCCESS_VALUE) return PREMIUM_CHECKOUT_SUCCESS_VALUE;
    if (raw === PREMIUM_CHECKOUT_CANCELED_VALUE) return PREMIUM_CHECKOUT_CANCELED_VALUE;
    return null;
  });

  useEffect(() => {
    // The return effect owns the quota refresh when Stripe sent us back, so skip
    // it here to avoid firing getQuota twice on the same render.
    if (user?.uid && user.uid !== GUEST_UID && !upgradeOutcome) {
      loadQuota();
    }
  }, [user?.uid, upgradeOutcome, loadQuota]);

  // Report the outcome and refresh the quota so the tier reflects the webhook,
  // then strip the param so a reload does not replay the toast.
  useEffect(() => {
    if (!upgradeOutcome) return;

    const next = new URLSearchParams(searchParams);
    next.delete(PREMIUM_CHECKOUT_SUCCESS_PARAM);
    setSearchParams(next, { replace: true });

    if (upgradeOutcome !== PREMIUM_CHECKOUT_SUCCESS_VALUE) {
      showToast(PREMIUM_TOAST_CHECKOUT_CANCELED, 'info');
      return;
    }

    // Stripe redirects back the instant Checkout completes, which is BEFORE the
    // webhook writes meta.tier. A single loadQuota() therefore races the webhook
    // and reads 'free' even when the purchase worked. Poll until the webhook
    // lands and only claim success once the tier actually flipped.
    let settled = false;
    let cancelled = false;
    let attempts = 0;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      settled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };

    const poll = async () => {
      await loadQuota();
      if (cancelled || settled) return;

      if (useGameStore.getState().quota?.tier === 'premium') {
        stop();
        showToast(PREMIUM_TOAST_UPGRADED, 'success');
        return;
      }

      attempts += 1;
      if (attempts * PREMIUM_POLL_INTERVAL_MS >= PREMIUM_POLL_TIMEOUT_MS) {
        stop();
        showToast(PREMIUM_TOAST_PENDING, 'info');
      }
    };

    intervalId = setInterval(() => { void poll(); }, PREMIUM_POLL_INTERVAL_MS);
    void poll();

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
    };
    // Intentionally mount-only: upgradeOutcome is captured once and must not
    // re-trigger the toast.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handlePremiumClick = useCallback(async () => {
    if (isGuest || !user) {
      showToast(PREMIUM_TOAST_GUARD, 'error');
      return;
    }

    const origin = window.location.origin;

    // Premium is a one-time purchase, so the upgrade button is not rendered for
    // premium users. This guard only covers a stale click landing between the
    // render and the click handler, or a race where the webhook just upgraded
    // the account while the free-tier button was still on screen.
    if (isPremium) {
      showToast(PREMIUM_TOAST_ALREADY_PREMIUM, 'info');
      return;
    }

    try {
      const url = await stripeService.createCheckoutSession(
        `${origin}${PREMIUM_CHECKOUT_SUCCESS_URL}`,
        `${origin}${PREMIUM_CHECKOUT_CANCEL_URL}`
      );
      window.location.href = url;
    } catch (error) {
      console.error('[SettingsView] Checkout failed:', error);
      showToast(PREMIUM_TOAST_CHECKOUT_ERROR, 'error');
    }
  }, [isGuest, isPremium, user, showToast]);

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
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-bold text-gray-900">Premium</h3>
              <p className="text-sm text-gray-500 mt-1">
                Desbloquear 5000 tarjetas activas, voces HD y sincronización prioritaria.
              </p>
            </div>
            {isPremium ? (
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-full px-3 py-1 flex-shrink-0">
                Plan Premium
              </span>
            ) : (
              <span className="text-xs font-semibold text-gray-500 bg-gray-50 border border-slate-200 rounded-full px-3 py-1 flex-shrink-0">
                Plan gratuito
              </span>
            )}
          </div>

          {quota && (
            <p className="text-xs text-gray-400 mt-3">
              Estado actual: {quota.cardCount}/{quota.cardQuota} tarjetas
            </p>
          )}

          {!isPremium && (
            <div className="mt-4">
              <button
                onClick={handlePremiumClick}
                disabled={isCheckoutPending}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold transition hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGuest ? 'Iniciá sesión para actualizar' : 'Actualizar a Premium'}
              </button>
            </div>
          )}

          {isPremium && (
            <p className="text-xs text-gray-400 mt-4">
              Pago único. Tu plan Premium no se renueva ni cobra de nuevo.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mt-4">
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
                Activo. Las grabaciones se suben a la nube y se eliminan de forma automática.
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
                Desactivado por defecto. Si falla el reconocimiento del navegador, la respuesta
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
