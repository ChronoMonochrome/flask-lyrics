import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useTranslation(); // Use the hook

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const success = await login(username, password);
      if (success) {
        // navigate to home;
      } else {
        setError(t('login_failed_error')); // Use translation
      }
    } catch (err) {
      setError(err.message || t('unexpected_error', { action: t('login_button').toLowerCase() })); // Use translation
    } finally {
        setLoading(false);
    }
  };

  return (
    <div>
      <h2>{t('login_title')}</h2> {/* Use translation */}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">{t('username_label')}</label> {/* Use translation */}
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">{t('password_label')}</label> {/* Use translation */}
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('logging_in_button') : t('login_button')} {/* Use translation */}
        </button>
      </form>
    </div>
  );
}

export default LoginPage;
