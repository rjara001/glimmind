import React from 'react';
import { VoiceCommandId } from '../../types';

interface CommandToastProps {
  command: VoiceCommandId | null;
}

interface CommandConfig {
  label: string;
  icon: string;
  color: string;
}

const COMMAND_CONFIG: Record<VoiceCommandId, CommandConfig> = {
  reveal: {
    label: 'Revelar',
    icon: '👁️',
    color: 'from-indigo-500/20 to-blue-500/20 border-indigo-500/40 text-indigo-800',
  },
  pass: {
    label: 'Siguiente',
    icon: '⏭️',
    color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-800',
  },
  continue: {
    label: 'Continuar',
    icon: '▶️',
    color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-800',
  },
  stop: {
    label: 'Detener',
    icon: '⏹️',
    color: 'from-rose-500/20 to-red-500/20 border-rose-500/40 text-rose-800',
  },
};

const FALLBACK_CONFIG: CommandConfig = {
  label: 'Comando',
  icon: '🎙️',
  color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-800',
};

export const CommandToast: React.FC<CommandToastProps> = ({ command }) => {
  if (!command) return null;

  const config = COMMAND_CONFIG[command] || FALLBACK_CONFIG;

  return (
    <>
      <style>{`
        @keyframes command-toast {
          0% { opacity: 0; transform: translate(20px, 20px) scale(0.8); }
          15% { opacity: 1; transform: translate(0, -30px) scale(1.05); }
          25% { transform: translate(0, -30px) scale(1); }
          75% { opacity: 1; transform: translate(0, -30px) scale(1); }
          100% { opacity: 0; transform: translate(0, -55px) scale(0.9); }
        }
        .animate-command-toast {
          animation: command-toast 1.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
      `}</style>
      <div
        role="status"
        aria-live="polite"
        className={`animate-command-toast pointer-events-none absolute bottom-3 right-3 z-50 flex items-center gap-2 rounded-full border bg-gradient-to-r px-4 py-1.5 backdrop-blur-md shadow-lg shadow-black/20 ${config.color}`}
      >
        <span className="text-sm leading-none">{config.icon}</span>
        <span className="font-mono text-[10px] font-semibold uppercase tracking-wider">
          Comando: <span className="font-bold underline decoration-dotted">{config.label}</span>
        </span>
      </div>
    </>
  );
};