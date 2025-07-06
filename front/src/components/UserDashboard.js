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
                <h2>{t('welcome_user', { username: currentUser.username })}!</h2> {/* Use translation */}
                {currentUser.avatar_url && (
                    <img src={currentUser.avatar_url} alt="User Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
                )}
                <p><strong>{t('nickname_label')}</strong> {currentUser.nickname || currentUser.username}</p> {/* Use translation */}
                <p><strong>{t('current_xp_label')}</strong> {currentUser.xp}</p> {/* Use translation */}
                <p><strong>{t('current_level_label')}</strong> {currentUser.level}</p> {/* Use translation */}
            </div>

            {currentUser.solved_riddles_ids && currentUser.solved_riddles_ids.length > 0 && (
                <div>
                    <h3>{t('solved_riddles_title')}</h3> {/* Use translation */}
                    <ul>
                        {currentUser.solved_riddles_ids.map(rId => <li key={rId}>{t('riddle_id_label', { riddleId: rId })}</li>)} {/* Use translation with interpolation */}
                    </ul>
                </div>
            )}
        </>
    );
};

export default UserDashboard;