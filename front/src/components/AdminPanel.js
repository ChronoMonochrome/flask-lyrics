// src/components/AdminPanel.js
import React, { useState } from 'react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const AdminPanel = () => {
    const { currentUser } = useAuth();
    const [kanjiText, setKanjiText] = useState('');
    const [hiraganaText, setHiraganaText] = useState('');
    const [xpReward, setXpReward] = useState(10);
    const [answers, setAnswers] = useState(''); // Comma-separated
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!currentUser || currentUser.username !== 'admin_user') { // Basic client-side admin check
            setMessage('Forbidden: You do not have admin access.');
            return;
        }

        const answersArray = answers.split(',').map(s => s.trim()).filter(s => s);

        try {
            const response = await api.post('/admin/add_riddle', {
                text_kanji: kanjiText,
                text_hiragana: hiraganaText,
                xp_reward: parseInt(xpReward),
                answers: answersArray
            });
            setMessage(`Riddle added: ${response.data.riddle.id}`);
            setKanjiText('');
            setHiraganaText('');
            setXpReward(10);
            setAnswers('');
        } catch (error) {
            setMessage(`Error adding riddle: ${error.response?.data?.message || error.message}`);
        }
    };

    if (!currentUser || currentUser.username !== 'admin_user') {
        return <p>You must be an admin to access this panel.</p>;
    }

    return (
        <div>
            <h2>Add New Riddle</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Riddle Text (Kanji/Kana):</label>
                    <textarea
                        value={kanjiText}
                        onChange={(e) => setKanjiText(e.target.value)}
                        required
                    ></textarea>
                </div>
                <div>
                    <label>Riddle Text (Hiragana Reading):</label>
                    <textarea
                        value={hiraganaText}
                        onChange={(e) => setHiraganaText(e.target.value)}
                        required
                    ></textarea>
                </div>
                <div>
                    <label>XP Reward:</label>
                    <input
                        type="number"
                        value={xpReward}
                        onChange={(e) => setXpReward(e.target.value)}
                        min="1"
                        required
                    />
                </div>
                <div>
                    <label>Accepted Answers (comma-separated):</label>
                    <input
                        type="text"
                        value={answers}
                        onChange={(e) => setAnswers(e.target.value)}
                        placeholder="e.g., くだもの,果物"
                        required
                    />
                </div>
                <button type="submit">Add Riddle</button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
};

export default AdminPanel;
