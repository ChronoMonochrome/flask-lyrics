// src/components/UserDashboard.js
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const UserDashboard = () => {
    const { currentUser } = useAuth();

    if (!currentUser) {
        return <p>Please log in to see your dashboard.</p>;
    }

    return (
        // Wrap all content in a single JSX Fragment
        <>
            <div>
                <h2>Welcome, {currentUser.username}!</h2>
                {currentUser.avatar_url && (
                    <img src={currentUser.avatar_url} alt="User Avatar" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
                )}
                <p><strong>Nickname:</strong> {currentUser.nickname || currentUser.username}</p> {/* Use nickname if available */}
                <p><strong>Current XP:</strong> {currentUser.xp}</p>
                <p><strong>Current Level:</strong> {currentUser.level}</p>
            </div> {/* This div now correctly wraps its content */}

            {/* This conditional block is now correctly adjacent to the closing `</div>` but within the fragment */}
            {currentUser.solved_riddles_ids && currentUser.solved_riddles_ids.length > 0 && (
                <div> {/* Add a div or fragment here too if this block might also have multiple top-level elements */}
                    <h3>Solved Riddles:</h3>
                    <ul>
                        {/* In a real app, you'd fetch details for these riddle IDs */}
                        {currentUser.solved_riddles_ids.map(rId => <li key={rId}>Riddle ID: {rId}</li>)}
                    </ul>
                </div>
            )}
        </>
    );
};

export default UserDashboard;