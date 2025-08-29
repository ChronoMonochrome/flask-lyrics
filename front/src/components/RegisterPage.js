import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register } = useAuth();
  const { t } = useTranslation(); // Use the hook

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const registrationSuccess = await register(username, password, email);
      if (registrationSuccess) {
        setSuccess(t('register_success_message')); // Use translation
        setUsername('');
        setEmail('');
        setPassword('');
        navigate('/');
      } else {
        setError(t('register_failed_error')); // Use translation
      }
    } catch (err) {
      setError(err.message || t('unexpected_error', { action: t('register_button').toLowerCase() })); // Use translation
    } finally {
        setLoading(false);
    }
  };

  return (
    <div>
      <h2>{t('register_title')}</h2> {/* Use translation */}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="reg-username">{t('username_label')}</label> {/* Use translation */}
          <input
            type="text"
            id="reg-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="reg-email">{t('email_label')}</label> {/* Use translation */}
          <input
            type="email"
            id="reg-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="reg-password">{t('password_label')}</label> {/* Use translation */}
          <input
            type="password"
            id="reg-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {success && <p style={{ color: 'green' }}>{success}</p>}
        <button type="submit" disabled={loading}>
          {loading ? t('registering_button') : t('register_button')} {/* Use translation */}
        </button>
      </form>
    </div>
  );
}

export default RegisterPage;
