import React, { useState, useEffect, useRef } from 'react';
import type { AppUser } from '../../types';

interface UserMenuProps {
  user: AppUser;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onNavigate, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-200 transition-all"
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {user.photoURL ? (
          <img src={user.photoURL} alt={user.displayName || 'User'} className="w-8 h-8 rounded-full" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
            {(user.displayName || user.email || '?')[0].toUpperCase()}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-bold text-slate-900 truncate">{user.displayName || 'Guest'}</p>
            {user.email && (
              <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
            )}
          </div>
          
          <button
            onClick={() => {
              setIsOpen(false);
              onNavigate('settings');
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>
          
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onLogout();
              }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
