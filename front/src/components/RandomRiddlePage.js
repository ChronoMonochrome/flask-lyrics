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
            // FIX: Backend returns the riddle object directly, not wrapped
            setRiddle(response); // Changed from response.riddle to response
            
            // Check if this specific riddle is already solved by the current user
            // You'll need to make sure currentUser.solved_riddles_ids is populated correctly
            // from your user_profile endpoint. If not, this logic might not work as intended.
            if (currentUser && currentUser.solved_riddles_ids?.includes(response.id)) { // Changed from response.riddle.id to response.id
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
            // Note: The backend response for submitAnswer might contain 'correct' instead of 'solved'
            // Please verify your backend response for submitAnswer
            const response = await submitAnswer(riddle.id, answerInput);
            setMessage(response.message);
            // It looks like your backend returns 'solved' (boolean) for the answer submission
            // but the frontend is checking 'response.correct'.
            // Ensure consistency or handle both if they are named differently.
            // Based on backend, it should be `response.solved`
            if (response.solved) { // Changed from response.correct to response.solved
                setSolvedLocally(true);
                setShowHiragana(true); // Show the correct answer
                if (currentUser) {
                    setCurrentUser(prevUser => ({
                        ...prevUser,
                        xp: response.new_xp,
                        level: response.new_level,
                        solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                    }));
                    // The backend for submit_answer does not return 'level_up' directly.
                    // You'd need to calculate it on the frontend by comparing old vs new level,
                    // or add 'level_up' to the backend response.
                    // For now, assuming you'll check `response.new_level > prevUser.level`
                    if (response.xp_gained > 0 && currentUser.level < response.new_level) { // check for level up
                        alert(`Congratulations! You leveled up to Level ${response.new_level}!`);
                    } else if (response.xp_gained > 0) {
                        alert(`Correct! You gained ${response.xp_gained} XP!`);
                    } else {
                        // This case might happen if already solved, or 0 XP riddle
                        alert(response.message);
                    }
                } else {
                    // For guests, update local storage. (This assumes backend sends correct answer back)
                    const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                    guestProgress[riddle.id] = { answered: true, correct: true, answer: answerInput, correctAnswer: response.actual_answer };
                    localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
                }
            } else {
                // If incorrect, show message but don't mark solved
                // The message will already indicate incorrectness
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
                 // Similar level-up check as in handleSubmit
                if (response.xp_gained > 0 && currentUser.level < response.new_level) {
                    alert(`Congratulations! You leveled up to Level ${response.new_level}!`);
                } else if (response.xp_gained > 0) {
                    alert(`Riddle marked correct! You gained ${response.xp_gained} XP.`);
                } else {
                    alert(response.message);
                }
            } else {
                // For guests, mark as solved locally
                const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                // The `riddle.answer` here is problematic. The random riddle endpoint
                // returns `correct_answers` (a list), not a single `answer`.
                // If you want to store the correct answer for guests, you'd need to
                // either pick one from `riddle.correct_answers[0]` or
                // ensure the mark_correct endpoint returns the actual answer.
                guestProgress[riddle.id] = { answered: true, correct: true, answer: riddle.correct_answers ? riddle.correct_answers[0] : '[N/A]' };
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

            {solvedLocally && riddle.correct_answers && riddle.correct_answers.length > 0 && <p>Correct Answer: {riddle.correct_answers[0]}</p>}
            {riddle.xp_reward && <p>XP Reward for this riddle: {riddle.xp_reward}</p>}

            <button onClick={fetchNewRiddle} style={{marginTop: '20px'}}>Get Another Random Riddle</button>
        </div>
    );
};

export default RandomRiddlePage;