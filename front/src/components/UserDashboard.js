// src/components/UserDashboard.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = () => {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <p>Please log in to see your dashboard.</p>;
    }

    return (
        <div>
            <h2>Welcome, {currentUser.username}!</h2>
            <p>Your current XP: {currentUser.xp}</p>
            <p>Your current Level: {currentUser.level}</p>
            {/* Potentially list solved riddles, etc. */}
        </div>
    );
};

export default UserDashboard;
