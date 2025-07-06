// front/src/App.js
import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RiddlesPage from './components/RiddlesPage';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import RandomRiddlePage from './components/RandomRiddlePage';
import NavBar from './components/NavBar';
import LanguageSwitcher from './components/LanguageSwitcher'; // Import the new component
import { useTranslation } from 'react-i18next';

function App() {
  const { t, i18n } = useTranslation();

  // New useEffect for language detection and persistence
  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    const systemLanguage = navigator.language.toLowerCase();

    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage);
    } else {
      let defaultLang = 'en'; // Default to English

      if (systemLanguage.startsWith('ru')) {
        defaultLang = 'ru';
      } else if (systemLanguage.startsWith('ja')) {
        defaultLang = 'jp'; // Assuming 'jp' is your Japanese code
      } else if (systemLanguage.startsWith('en')) {
        defaultLang = 'en';
      }
      
      i18n.changeLanguage(defaultLang);
      localStorage.setItem('i18nextLng', defaultLang); // Save the detected language
    }
  }, [i18n]); // Dependency array: re-run only if i18n instance changes

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
          <Route path="/riddles" element={<RiddlesPage />} />
          <Route path="/dashboard" element={<UserDashboard />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/random-riddle" element={<RandomRiddlePage />} />
        </Routes>
      </main>

      {/* Language switcher moved to footer-like area */}
      <footer style={{ marginTop: 'auto', padding: '20px', textAlign: 'center' }}>
        <LanguageSwitcher />
        {/* You can add other footer content here if needed */}
      </footer>
    </div>
  );
}

export default App;