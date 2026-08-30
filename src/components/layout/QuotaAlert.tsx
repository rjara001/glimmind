import React from 'react';
import type { QuotaStatus } from '../../types/quota';

interface QuotaAlertProps {
  status: QuotaStatus | null;
}

const ALERT_STYLES: Record<string, { bg: string; border: string; text: string; icon: string; title: string }> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-800',
    icon: '⚠️',
    title: 'Estás acercándote al límite de tarjetas',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    icon: '🚨',
    title: 'Te quedan pocas tarjetas disponibles',
  },
  blocked: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-900',
    icon: '🔴',
    title: 'Llegaste al límite de tarjetas',
  },
};

export const QuotaAlert: React.FC<QuotaAlertProps> = ({ status }) => {
  if (!status || status.level === 'ok') return null;

  const style = ALERT_STYLES[status.level];
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
            ? 'Eliminá o archivá tarjetas para poder crear nuevas listas.'
            : 'Considerá organizar o archivar tarjetas que ya dominás.'}
        </p>
      </div>
    </div>
  );
};
