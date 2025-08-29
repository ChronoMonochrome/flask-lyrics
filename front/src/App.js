// front/src/App.js
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import UserDashboard from './components/UserDashboard';
import NavBar from './components/NavBar';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

// NEW IMPORTS
import LyricsPage from './components/LyricsPage';
import WordLookupPage from './components/WordLookupPage';

function App() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    const systemLanguage = navigator.language.toLowerCase();

    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    } else {
      let defaultLang = 'en';

      if (systemLanguage.startsWith('ru')) {
        defaultLang = 'ru';
      } else if (systemLanguage.startsWith('ja')) {
        defaultLang = 'jp';
      } else if (systemLanguage.startsWith('en')) {
        defaultLang = 'en';
      }

      i18n.changeLanguage(defaultLang);
      localStorage.setItem('i18nextLng', defaultLang);
    }
  }, [i18n]);

  return (
    <div className="App">
    <NavBar />

    <main>
    <Routes>
    <Route path="/" element={
      <div>
      <h1>{t('welcome_title')}</h1>
      <p>{t('home_description')}</p>
      <p>{t('start_playing_prompt')}</p>
      </div>
    } />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/dashboard" element={<UserDashboard />} />

    {/* NEW ROUTES FOR LYRICS AND WORD LOOKUP */}
    <Route path="/lyrics" element={<LyricsPage />} />
    <Route path="/words/:word" element={<WordLookupPage />} />
    </Routes>
    </main>

    <footer style={{ marginTop: 'auto', padding: '20px', textAlign: 'center' }}>
    <LanguageSwitcher />
    </footer>
    </div>
  );
}

export default App;
