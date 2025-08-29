import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const UserDashboard = () => {
    const { currentUser } = useAuth();
    const { t } = useTranslation(); // Use the hook

    if (!currentUser) {
        return <p>{t('please_login_dashboard')}</p>; // Use translation
    }

    return (
        <>
            <div>
                {/* Pass xp and level for interpolation */}
                <h2>{t('welcome_user', { username: currentUser.username, xp: currentUser.xp, level: currentUser.level })}!</h2> {/* Use translation */}
                {currentUser.avatar_url && (
                    <img src={currentUser.avatar_url} alt="User Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
                )}
                <p><strong>{t('nickname_label')}</strong> {currentUser.nickname || currentUser.username}</p> {/* Use translation */}
                {/* These are already explicitly displayed below, but it's fine */}
                <p><strong>{t('current_xp_label')}</strong> {currentUser.xp}</p> {/* Use translation */}
                <p><strong>{t('current_level_label')}</strong> {currentUser.level}</p> {/* Use translation */}
            </div>
        </>
    );
};

export default UserDashboard;
