import React from 'react';
import { APP_VERSION } from '../../constants/version';
import { UserMenu } from './UserMenu';
import type { AppUser } from '../../types';

interface AppHeaderProps {
  view: string;
  user: AppUser | null;
  onShowQuickAdd: () => void;
  onSync: () => void;
  isSyncing: boolean;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  view,
  user,
  onShowQuickAdd,
  onSync,
  isSyncing,
  onNavigate,
  onLogout,
}) => {
  return (
    <header className={`bg-white border-b border-slate-200 px-4 py-3 ${view === 'game' ? 'hidden sm:block' : ''}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-black text-slate-900 tracking-tight">Glimmind</h1>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">v{APP_VERSION}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onShowQuickAdd}
            aria-label="Add value"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Add</span>
          </button>
          {user && (
            <UserMenu user={user} onNavigate={onNavigate} onLogout={onLogout} />
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          <svg className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isSyncing ? 'Sync...' : 'Sync'}
        </button>
        <button
          onClick={() => onNavigate('activity')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${view === 'activity' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
        >
          Activity
        </button>
        <button
          onClick={() => onNavigate('reports')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${view === 'reports' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:text-indigo-600'}`}
        >
          Reports
        </button>
        <button
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
          className="text-slate-400 hover:text-indigo-600 transition-colors p-1.5 whitespace-nowrap"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <span className="text-[10px] text-slate-400 ml-1 whitespace-nowrap">v{APP_VERSION}</span>
      </div>
    </header>
  );
};
