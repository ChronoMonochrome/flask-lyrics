// src/components/RandomRiddlePage.js
import React, { useState, useEffect } from 'react';
import { getRandomRiddle, submitAnswer, markRiddleCorrect } from '../services/api';
import FuriganaText from './FuriganaText';
import { useAuth } from '../contexts/AuthContext';

const RandomRiddlePage = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const [riddle, setRiddle] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [message, setMessage] = useState('');
    const [solvedLocally, setSolvedLocally] = useState(false); // Tracks if current riddle card is solved
    const [showHiragana, setShowHiragana] = useState(false);

    const fetchNewRiddle = async () => {
        setRiddle(null); // Clear previous riddle
        setAnswerInput('');
        setMessage('');
        setSolvedLocally(false);
        setShowHiragana(false);
        try {
            const response = await getRandomRiddle();
            setRiddle(response.riddle); // Assuming backend returns { riddle: {...} }
            // Check if this specific riddle is already solved by the current user
            if (currentUser && currentUser.solved_riddles_ids?.includes(response.riddle.id)) {
                setSolvedLocally(true);
                setMessage('You have already solved this riddle!');
                setShowHiragana(true); // Show answer for already solved
            }
        } catch (error) {
            setMessage(`Error fetching random riddle: ${error.response?.data?.message || error.message}`);
        }
    };

    useEffect(() => {
        fetchNewRiddle();
    }, [currentUser]); // Re-fetch if user logs in/out

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await submitAnswer(riddle.id, answerInput);
            setMessage(response.message);
            if (response.correct) {
                setSolvedLocally(true);
                setShowHiragana(true); // Show the correct answer
                if (currentUser) {
                    setCurrentUser(prevUser => ({
                        ...prevUser,
                        xp: response.new_xp,
                        level: response.new_level,
                        solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                    }));
                    if (response.level_up) {
                        alert(`Congratulations! You leveled up to Level ${response.new_level}!`);
                    } else {
                        alert(`Correct! You gained ${response.xp_gained} XP!`);
                    }
                } else {
                    // For guests, update local storage. (This assumes backend sends correct answer back)
                    const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                    guestProgress[riddle.id] = { answered: true, correct: true, answer: answerInput, correctAnswer: response.actual_answer };
                    localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
                }
            } else {
                // If incorrect, show message but don't mark solved
            }
        } catch (error) {
            setMessage(`Error submitting answer: ${error.response?.data?.message || error.message}`);
        }
    };

    const handleMarkCorrect = async () => {
        setMessage('');
        try {
            const response = await markRiddleCorrect(riddle.id);
            setMessage(response.message);
            setSolvedLocally(true);
            setShowHiragana(true);
            if (currentUser) {
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    xp: response.new_xp,
                    level: response.new_level,
                    solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                }));
                 if (response.level_up) {
                    alert(`Congratulations! You leveled up to Level ${response.new_level}!`);
                } else {
                    alert(`Riddle marked correct! You gained ${response.xp_gained} XP.`);
                }
            } else {
                // For guests, mark as solved locally
                const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                guestProgress[riddle.id] = { answered: true, correct: true, answer: riddle.answer }; // assuming riddle.answer is available for guests
                localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
            }
        } catch (error) {
            setMessage(`Error marking correct: ${error.response?.data?.message || error.message}`);
        }
    };

    if (!riddle) {
        return <div>Loading random riddle...</div>;
    }

    return (
        <div>
            <h2>Random Riddle!</h2>
            <div className="riddle-display">
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
                    disabled={solvedLocally}
                />
                <button type="submit" disabled={solvedLocally}>Submit Answer</button>
            </form>

            {message && <p>{message}</p>}

            {!solvedLocally && (
                <button onClick={handleMarkCorrect} style={{marginTop: '10px'}}>
                    I was correct! (Give me XP)
                </button>
            )}

            {solvedLocally && <p style={{ color: 'green', fontWeight: 'bold' }}>You solved this riddle!</p>}
            {solvedLocally && riddle.answer && <p>Correct Answer: {riddle.answer}</p>}
            {riddle.xp_reward && <p>XP Reward for this riddle: {riddle.xp_reward}</p>}

            <button onClick={fetchNewRiddle} style={{marginTop: '20px'}}>Get Another Random Riddle</button>
        </div>
    );
};

export default RandomRiddlePage;