import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const NavBar = () => {
  const { currentUser, logout, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation(); // Use the hook

  if (loading) {
    return (
      <nav>
        <ul>
          <li><Link to="/">{t('navigation_home')}</Link></li> {/* Use translation */}
          <li>{t('loading_navigation')}</li> {/* Use translation */}
        </ul>
      </nav>
    );
  }

  const handleLogout = () => {
    logout();
    localStorage.removeItem('guest_progress');
    navigate('/');
  };

  return (
    <nav>
      <ul>
        <li><Link to="/">{t('navigation_home')}</Link></li> {/* Use translation */}
        {!currentUser && <li><Link to="/login">{t('navigation_login')}</Link></li>} {/* Use translation */}
        {!currentUser && <li><Link to="/register">{t('navigation_register')}</Link></li>} {/* Use translation */}
        {currentUser && <li><Link to="/dashboard">{t('navigation_dashboard')}</Link></li>} {/* Use translation */}
        {currentUser && currentUser.role === 'admin' && <li><Link to="/admin">{t('navigation_admin_panel')}</Link></li>} {/* Use translation */}
        {currentUser && <li><button onClick={handleLogout}>{t('navigation_logout')}</button></li>} {/* Use translation */}
        <li><Link to="/riddles">{t('navigation_riddles')}</Link></li> {/* Use translation */}
        <li><Link to="/random-riddle">{t('navigation_random_riddle')}</Link></li> {/* Use translation */}
      </ul>
    </nav>
  );
};

export default NavBar;