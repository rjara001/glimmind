import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../../constants/app';

export const LandingLanguageSelector: React.FC = () => {
  const { i18n: i18nInstance, t } = useTranslation('common');
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === i18nInstance.language) || SUPPORTED_LANGUAGES[0];

  const handleLanguageChange = (code: string) => {
    void i18nInstance.changeLanguage(code);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const toggle = (
    <button
      ref={buttonRef}
      type="button"
      className={`lang-switcher-btn ${isOpen ? 'open' : ''}`}
      onClick={() => setIsOpen((prev) => !prev)}
      aria-label={t('idioma', 'Idioma')}
      aria-expanded={isOpen}
      aria-haspopup="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
      <span id="current-lang-label">{currentLang.label}</span>
      <svg
        id="chevron-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    </button>
  );

  const dropdown = (
    <div ref={dropdownRef} className={`lang-dropdown ${isOpen ? 'show' : ''}`}>
      {SUPPORTED_LANGUAGES.map((lang) => (
        <button
          key={lang.code}
          type="button"
          className={`lang-option ${i18nInstance.language === lang.code ? 'active' : ''}`}
          onClick={() => handleLanguageChange(lang.code)}
          aria-pressed={i18nInstance.language === lang.code}
        >
          <span role="img" aria-hidden="true">{lang.flag}</span>
          <span>{lang.label}</span>
        </button>
      ))}
    </div>
  );

  return (
    <div className="lang-switcher-container">
      {toggle}
      {createPortal(dropdown, document.body)}
    </div>
  );
};

export default LandingLanguageSelector;
