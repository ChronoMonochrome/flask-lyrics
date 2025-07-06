// front/src/components/LanguageSwitcher.js
import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSwitcher.css'; // Create this CSS file for styling

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng); // Store selected language
  };

  return (
    <div className="language-switcher">
      <button 
        onClick={() => changeLanguage('en')} 
        className={i18n.language === 'en' ? 'active' : ''}
      >
        English
      </button>
      <button 
        onClick={() => changeLanguage('ru')} 
        className={i18n.language === 'ru' ? 'active' : ''}
      >
        Русский
      </button>
      <button 
        onClick={() => changeLanguage('jp')} 
        className={i18n.language === 'jp' ? 'active' : ''}
      >
        日本語
      </button>
    </div>
  );
};

export default LanguageSwitcher;