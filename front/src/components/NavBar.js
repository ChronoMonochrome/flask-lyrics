import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const NavBar = () => {
    const { currentUser, logout, loading } = useAuth();
    const navigate = useNavigate();
    const { t } = useTranslation(); // Use the hook

    // Inline styles for responsiveness
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
        flexWrap: 'wrap', // Allow items to wrap to the next line
        justifyContent: 'center', // Center items horizontally
        gap: '15px', // Space between items
    };

    const liStyle = {
        margin: '5px 0', // Vertical margin for wrapped items
    };

    const linkStyle = {
        color: 'white',
        textDecoration: 'none',
        padding: '8px 12px',
        borderRadius: '5px',
        transition: 'background-color 0.3s ease',
        whiteSpace: 'nowrap', // Prevent text from wrapping within a link
        // Add hover effect
        ':hover': {
            backgroundColor: '#555',
        },
    };

    // Note: buttonStyle is no longer strictly needed if logout is a Link,
    // but leaving it for reference or if you decide to keep a button.
    const buttonStyle = {
        backgroundColor: '#dc3545', // Red for logout
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
        // Since it's a Link, we'll let the Link component handle navigation.
        // The logout function will still be called on click.
    };

    return (
        <nav style={navStyle}>
            <ul style={ulStyle}>
                <li style={liStyle}><Link to="/" style={linkStyle}>{t('navigation_home')}</Link></li>
                {!currentUser && <li style={liStyle}><Link to="/login" style={linkStyle}>{t('navigation_login')}</Link></li>}
                {!currentUser && <li style={liStyle}><Link to="/register" style={linkStyle}>{t('navigation_register')}</Link></li>}
                {currentUser && <li style={liStyle}><Link to="/dashboard" style={linkStyle}>{t('navigation_dashboard')}</Link></li>}
                {currentUser && currentUser.role === 'admin' && <li style={liStyle}><Link to="/admin" style={linkStyle}>{t('navigation_admin_panel')}</Link></li>}
                {currentUser && (
                    <li style={liStyle}>
                        {/* Changed to Link component, onClick handles logout */}
                        <Link to="/" onClick={handleLogout} style={linkStyle}>
                            {t('navigation_logout')}
                        </Link>
                    </li>
                )}
                <li style={liStyle}><Link to="/riddles" style={linkStyle}>{t('navigation_riddles')}</Link></li>
                <li style={liStyle}><Link to="/random-riddle" style={linkStyle}>{t('navigation_random_riddle')}</Link></li>
            </ul>
        </nav>
    );
};

export default NavBar;