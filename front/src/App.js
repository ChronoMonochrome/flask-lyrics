import React from 'react';
import { Routes, Route } from 'react-router-dom';
import './App.css';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import RiddlesPage from './components/RiddlesPage';
import UserDashboard from './components/UserDashboard';
import AdminPanel from './components/AdminPanel';
import RandomRiddlePage from './components/RandomRiddlePage';
import NavBar from './components/NavBar';
import { useTranslation } from 'react-i18next'; // Import useTranslation

function App() {
  const { t, i18n } = useTranslation(); // Use the hook

  // Function to change language
  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="App">
      <NavBar />

      {/* Language switcher */}
      <div style={{ padding: '10px', textAlign: 'right' }}>
        <button onClick={() => changeLanguage('en')} style={{ marginRight: '5px' }}>English</button>
        <button onClick={() => changeLanguage('ru')} style={{ marginRight: '5px' }}>Русский</button>
        <button onClick={() => changeLanguage('jp')}>日本語</button>
      </div>

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
    </div>
  );
}

export default App;