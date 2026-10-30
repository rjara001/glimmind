import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppUser } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../constants/app';

interface UserMenuProps {
  user: AppUser;
  onNavigate: (view: string) => void;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, onNavigate, onLogout }) => {
  const { t, i18n } = useTranslation(['nav', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const [isLangSubmenuOpen, setIsLangSubmenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentLangCode = i18n.language || 'es';
  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode) ||
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLangCode.slice(0, 2)) ||
    SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsLangSubmenuOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        setIsLangSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSelectLanguage = (code: string) => {
    void i18n.changeLanguage(code);
    setIsLangSubmenuOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 p-0.5 rounded-full hover:ring-2 hover:ring-indigo-200 transition-all"
        aria-label={t('menu_de_usuario', 'Menú de usuario')}
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
            <p className="text-sm font-bold text-slate-900 truncate">{user.displayName || t('invitado', 'Invitado')}</p>
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
            {t('ajustes_3', 'Ajustes')}
          </button>

          <div>
            <button
              onClick={() => setIsLangSubmenuOpen(!isLangSubmenuOpen)}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              aria-expanded={isLangSubmenuOpen}
            >
              <div className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a17 17 0 000 18M12.5 3a17 17 0 010 18" />
                </svg>
                <span>{t('idioma', 'Idioma')}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 uppercase flex items-center gap-1">
                  <span>{currentLang.flag}</span>
                  <span>{currentLang.short}</span>
                </span>
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isLangSubmenuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {isLangSubmenuOpen && (
              <div className="bg-slate-50/80 border-y border-slate-100 py-1">
                {SUPPORTED_LANGUAGES.map((lang) => {
                  const isSelected = currentLang.code === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => handleSelectLanguage(lang.code)}
                      className={`w-full flex items-center justify-between px-8 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 text-indigo-600 font-semibold'
                          : 'text-slate-700 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span role="img" aria-hidden="true" className="text-sm">
                          {lang.flag}
                        </span>
                        <span>{lang.label}</span>
                      </div>
                      {isSelected && (
                        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

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
              {t('cerrar_sesion', 'Cerrar sesión')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
