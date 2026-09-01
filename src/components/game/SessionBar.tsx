import React from 'react';
import { SessionBarProps } from '../../types/session-bar-props';

export const SessionBar: React.FC<SessionBarProps> = ({
  gameMode,
  goalProgress = 0,
  goalTarget = 0,
  sessionRepasos = 0,
  onSettingsClick,
  onRestart,
  voiceEnabled,
  onVoiceToggle,
  isPremium,
  isRecording,
  onRecordToggle,
  onViewRecordings,
  isPresentationActive,
  onPracticeToggle,
}) => {
  const isPracticeMode = gameMode === 'training';

  return (
    <div className="flex items-center gap-2">
      <div className="hidden lg:flex items-center gap-3 bg-white/60 rounded-xl border border-slate-100 shadow-sm px-4 py-2">
        {goalTarget > 0 && (
          <span className="text-xs font-bold text-indigo-600 whitespace-nowrap">
            Meta {Math.min(goalProgress, goalTarget)}/{goalTarget}
          </span>
        )}
        <span className="w-px h-4 bg-slate-200"></span>
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Sesión {sessionRepasos}</span>
      </div>
      <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
        <span className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold text-slate-500">
          {isPracticeMode ? 'Modo Práctica' : 'Modo Real'}
        </span>
      </div>
      {onVoiceToggle && (
        <button
          onClick={onVoiceToggle}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
            voiceEnabled
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200'
          }`}
          aria-label={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {voiceEnabled ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            )}
          </svg>
          <span className="hidden sm:inline">{voiceEnabled ? 'Voz ON' : 'Voz OFF'}</span>
        </button>
      )}
      {isPremium && onRecordToggle && (
        <button
          onClick={onRecordToggle}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
            isRecording
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
          }`}
          aria-label={isRecording ? 'Detener grabación' : 'Grabar voz'}
        >
          {isRecording ? (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          )}
          <span className="hidden sm:inline">{isRecording ? 'Detener' : 'Grabar Voz'}</span>
        </button>
      )}
      {isPremium && onViewRecordings && (
        <button
          onClick={onViewRecordings}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200"
          aria-label="Ver historial de grabaciones"
          title="Historial de grabaciones"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
          <span className="hidden sm:inline">Historial</span>
        </button>
      )}
      {isPresentationActive !== undefined && onPracticeToggle && gameMode === 'training' && (
        <button
          onClick={onPracticeToggle}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[10px] sm:text-xs font-bold transition-all ${
            isPresentationActive
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
          aria-label={isPresentationActive ? 'Detener AutoPlay' : 'Iniciar AutoPlay'}
          title={isPresentationActive ? 'Detener AutoPlay' : 'Iniciar AutoPlay'}
        >
          {isPresentationActive ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.25 12h15.5M4.25 12A2.25 2.25 0 016.5 9.75v4.5A2.25 2.25 0 014.25 12zM4.25 12l3.25 3.25M4.25 12L6 9.75" />
            </svg>
          )}
          <span className="hidden sm:inline">{isPresentationActive ? 'Listo' : 'AutoPlay'}</span>
        </button>
      )}
      {onRestart && (
        <button onClick={onRestart} className="text-slate-400 hover:text-rose-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm group" aria-label="Restart list">
          <svg className="w-6 h-6 group-hover:-rotate-180 transition-transform duration-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        </button>
      )}
      <button onClick={onSettingsClick} className="text-slate-400 hover:text-indigo-600 transition-all p-2 bg-white rounded-xl border border-slate-100 shadow-sm group">
        <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.438.991s.145.75.438.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.063-.374-.313-.686-.645-.87a6.52 6.52 0 01-.22-.127c-.324-.196-.72-.257-1.075-.124l-1.217.456a1.125 1.125 0 01-1.37-.49l-1.296-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.437-.991s-.145-.75-.437-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582.495.644-.869l.214-1.281z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </div>
  );
};
