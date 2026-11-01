import React from 'react';
import { useTranslation } from 'react-i18next';
import type { QuotaStatus } from '../../types/quota';

interface QuotaAlertProps {
  status: QuotaStatus | null;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export const QuotaAlert: React.FC<QuotaAlertProps> = ({ status, loading, error, onRetry }) => {
  const { t } = useTranslation(['nav', 'common']);

  if (loading) {
    return (
      <div
        role="status"
        className="mb-4 rounded-xl border border-gray-200 bg-white p-4 flex items-center gap-3"
      >
        <svg className="animate-spin h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" aria-hidden="true">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm text-gray-500">{t('calculando_limites', 'Calculando límites…')}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-center gap-3"
      >
        <span className="text-lg flex-shrink-0">⚠️</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">
            {t('no_se_pudieron_cargar_tus_limites', 'No se pudieron cargar tus límites')}
          </p>
          <p className="text-xs mt-1 text-amber-700 opacity-80">
            {t('no_pudimos_verificar_tu_tier_podrias_ver_l', 'No pudimos verificar tu tier: podrías ver límites que no te corresponden.')}
          </p>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="text-xs font-semibold text-amber-800 underline hover:no-underline flex-shrink-0"
          >
            {t('reintentar_2', 'Reintentar')}
          </button>
        )}
      </div>
    );
  }

  if (!status || status.level === 'ok') return null;

  const styleConfig: Record<string, { bg: string; border: string; text: string; icon: string; title: string }> = {
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-800',
      icon: '⚠️',
      title: t('estas_acercandote_al_limite_de_tarjetas', 'Estás acercándote al límite de tarjetas'),
    },
    danger: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: '🚨',
      title: t('te_quedan_pocas_tarjetas_disponibles', 'Te quedan pocas tarjetas disponibles'),
    },
    blocked: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-900',
      icon: '🔴',
      title: t('llegaste_al_limite_de_tarjetas', 'Llegaste al límite de tarjetas'),
    },
  };

  const style = styleConfig[status.level];
  if (!style) return null;

  return (
    <div className={`mb-4 rounded-xl border p-4 flex items-start gap-3 ${style.bg} ${style.border}`}>
      <span className="text-lg flex-shrink-0">{style.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${style.text}`}>
          {style.title} ({status.currentCards}/{status.maxCards})
        </p>
        <p className={`text-xs mt-1 ${style.text} opacity-80`}>
          {status.level === 'blocked'
            ? t('elimina_o_archiva_tarjetas_para_poder_crea', 'Eliminá o archivá tarjetas para poder crear nuevas listas.')
            : t('considera_organizar_o_archivar_tarjetas', 'Considerá organizar o archivar tarjetas que ya dominás.')}
        </p>
      </div>
    </div>
  );
};
