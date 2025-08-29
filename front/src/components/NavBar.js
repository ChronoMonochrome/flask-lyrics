// front/src/components/NavBar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const NavBar = () => {
    const { currentUser, logout, loading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const navStyle = {
        backgroundColor: '#333',
        padding: '10px 0',
        color: 'white',
        textAlign: 'center',
    };

    const ulStyle = {
        listStyle: 'none',
        padding: 0,
        margin: 0,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '15px',
    };

    const liStyle = {
        margin: '5px 0',
    };

    const linkStyle = {
        color: 'white',
        textDecoration: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        transition: 'background-color 0.3s ease',
        whiteSpace: 'nowrap',
        ':hover': {
            backgroundColor: '#555',
        },
    };

    const buttonStyle = {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        transition: 'background-color 0.3s ease',
        ':hover': {
            backgroundColor: '#c82333',
        },
    };

    if (loading) {
        return (
            <nav style={navStyle}>
            <ul style={ulStyle}>
            <li style={liStyle}><Link to="/" style={linkStyle}>{t('navigation_home')}</Link></li>
            <li style={liStyle}>{t('loading_navigation')}</li>
            </ul>
            </nav>
        );
    }

    const handleLogout = () => {
        logout();
        localStorage.removeItem('guest_progress');
    };

    return (
        <nav style={navStyle}>
        <ul style={ulStyle}>
        <li style={liStyle}><Link to="/" style={linkStyle}>{t('navigation_home')}</Link></li>
        <li style={liStyle}><Link to="/lyrics" style={linkStyle}>{t('navigation_lyrics')}</Link></li> {/* NEW LINK */}
        {!currentUser && <li style={liStyle}><Link to="/login" style={linkStyle}>{t('navigation_login')}</Link></li>}
        {!currentUser && <li style={liStyle}><Link to="/register" style={linkStyle}>{t('navigation_register')}</Link></li>}
        {currentUser && <li style={liStyle}><Link to="/dashboard" style={linkStyle}>{t('navigation_dashboard')}</Link></li>}
        {currentUser && currentUser.role === 'admin' && <li style={liStyle}><Link to="/admin" style={linkStyle}>{t('navigation_admin_panel')}</Link></li>}
        {currentUser && (
            <li style={liStyle}>
            <Link to="/" onClick={handleLogout} style={linkStyle}>
            {t('navigation_logout')}
            </Link>
            </li>
        )}
        </ul>
        </nav>
    );
};

export default NavBar;
