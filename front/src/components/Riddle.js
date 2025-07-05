// src/components/Riddle.js
import React, { useState, useEffect } from 'react';
import api from '../services/api';
import FuriganaText from './FuriganaText';
import { useAuth } from '../contexts/AuthContext';

const Riddle = ({ riddleId }) => {
    const { currentUser, setCurrentUser } = useAuth();
    const [riddle, setRiddle] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [message, setMessage] = useState('');
    const [solved, setSolved] = useState(false);
    const [showHiragana, setShowHiragana] = useState(false);

    useEffect(() => {
        if (riddleId) {
            fetchRiddle();
        }
    }, [riddleId]);

    const fetchRiddle = async () => {
        try {
            const response = await api.get(`/riddles/${riddleId}`);
            setRiddle(response.data);
            // Check user's progress for this riddle
            // (You'd ideally have an API endpoint for user progress on a specific riddle)
            // For now, assume a fresh load or check from currentUser.user_progress if available
            // A better way: fetch user_progress specifically for this riddle on load.
        } catch (error) {
            setMessage(`Error fetching riddle: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await api.post(`/riddles/${riddle.id}/submit_answer`, {
                answer_text: answerInput,
            });
            setMessage(response.data.message);
            setSolved(response.data.solved);
            if (response.data.solved) {
                // Update user's XP/level in context
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    xp: response.data.new_xp,
                    level: response.data.new_level
                }));
            }
        } catch (error) {
            setMessage(`Error submitting answer: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleMarkCorrect = async () => {
        setMessage('');
        try {
            const response = await api.post(`/riddles/${riddle.id}/mark_correct`);
            setMessage(response.data.message);
            setSolved(true);
            // Update user's XP/level in context
            setCurrentUser(prevUser => ({
                ...prevUser,
                xp: response.data.new_xp,
                level: response.data.new_level
            }));
        } catch (error) {
            setMessage(`Error marking correct: ${error.response?.data?.message || error.message}`);
        }
    };

    if (!riddle) {
        return <div>Loading riddle...</div>;
    }

    return (
        <div>
            <h2>Riddle Time!</h2>
            <div>
                <FuriganaText kanjiText={riddle.text_kanji} hiraganaText={riddle.text_hiragana} />
                {showHiragana && <p className="hiragana-hint">Reading: {riddle.text_hiragana}</p>}
                <button onClick={() => setShowHiragana(!showHiragana)}>
                    {showHiragana ? 'Hide Reading' : 'Show Reading'}
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder="Your answer in hiragana/katakana"
                    disabled={solved}
                />
                <button type="submit" disabled={solved}>Submit Answer</button>
            </form>

            {message && <p>{message}</p>}

            {!solved && (
                <button onClick={handleMarkCorrect}>
                    I was correct! (Give me XP)
                </button>
            )}

            {solved && <p>You solved this riddle!</p>}
            <p>XP Reward: {riddle.xp_reward}</p>
        </div>
    );
};

export default Riddle;
