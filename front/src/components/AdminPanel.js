// src/components/AdminPanel.js
import React, { useState } from 'react';
import { addRiddle } from '../services/api'; // Use the new addRiddle API
import { useAuth } from '../contexts/AuthContext';

const AdminPanel = () => {
    const { currentUser } = useAuth();
    const [kanjiText, setKanjiText] = useState('');
    const [hiraganaText, setHiraganaText] = useState('');
    const [xpReward, setXpReward] = useState(10);
    const [answers, setAnswers] = useState(''); // Comma-separated
    const [message, setMessage] = useState('');

    // Check for admin role
    if (!currentUser || currentUser.role !== 'admin') {
        return <p>You must be an admin to access this panel. (Current role: {currentUser ? currentUser.role : 'Guest'})</p>;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        const answersArray = answers.split(',').map(s => s.trim()).filter(s => s);

        try {
            const response = await addRiddle({ // Use the addRiddle API call
                text_kanji: kanjiText,
                text_hiragana: hiraganaText,
                xp_reward: parseInt(xpReward),
                answers: answersArray
            });
            setMessage(`Riddle added: ${response.riddle.id}`); // Access riddle directly from response.data
            setKanjiText('');
            setHiraganaText('');
            setXpReward(10);
            setAnswers('');
        } catch (error) {
            setMessage(`Error adding riddle: ${error.response?.data?.message || error.message}`);
        }
    };

    return (
        <div>
            <h2>Add New Riddle (Admin)</h2>
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