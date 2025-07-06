import React, { useState, useEffect } from 'react';
import { getRandomRiddle, submitAnswer, markRiddleCorrect } from '../services/api';
import FuriganaText from './FuriganaText';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next'; // Import useTranslation

const RandomRiddlePage = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const [riddle, setRiddle] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [message, setMessage] = useState('');
    const [solvedLocally, setSolvedLocally] = useState(false);
    const [showHiragana, setShowHiragana] = useState(false);
    const { t } = useTranslation(); // Use the hook

    const fetchNewRiddle = async () => {
        setRiddle(null);
        setAnswerInput('');
        setMessage('');
        setSolvedLocally(false);
        setShowHiragana(false);
        try {
            const response = await getRandomRiddle();
            setRiddle(response);

            if (currentUser && currentUser.solved_riddles_ids?.includes(response.id)) {
                setSolvedLocally(true);
                setMessage(t('already_solved_riddle')); // Use translation
                setShowHiragana(true);
            }
        } catch (error) {
            setMessage(t('error_fetching_riddles', { message: error.response?.data?.message || error.message })); // Use translation
        }
    };

    useEffect(() => {
        fetchNewRiddle();
    }, [currentUser]); // Re-fetch if user logs in/out, or on first render

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await submitAnswer(riddle.id, answerInput);
            setMessage(response.message);

            if (response.solved) {
                setSolvedLocally(true);
                setShowHiragana(true);
                if (currentUser) {
                    const prevLevel = currentUser.level; // Get previous level for comparison
                    setCurrentUser(prevUser => ({
                        ...prevUser,
                        xp: response.new_xp,
                        level: response.new_level,
                        solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                    }));

                    if (response.new_level > prevLevel) { // Check for level up
                        alert(t('alert_level_up', { newLevel: response.new_level })); // Use translation
                    } else if (response.xp_gained > 0) {
                        alert(t('alert_xp_gained', { xpGained: response.xp_gained })); // Use translation
                    } else {
                        // This case might happen if already solved, or 0 XP riddle
                        alert(response.message); // Use original message for other cases
                    }
                } else {
                    const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                    guestProgress[riddle.id] = { answered: true, correct: true, answer: answerInput, correctAnswer: response.actual_answer };
                    localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
                }
            } else {
                // Message will already indicate incorrectness
            }
        } catch (error) {
            setMessage(t('riddle_submission_failed')); // Use translation
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
                const prevLevel = currentUser.level; // Get previous level for comparison
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    xp: response.new_xp,
                    level: response.new_level,
                    solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                }));
                if (response.new_level > prevLevel) { // Check for level up
                    alert(t('alert_level_up', { newLevel: response.new_level })); // Use translation
                } else if (response.xp_gained > 0) {
                    alert(t('alert_riddle_marked_correct', { xpGained: response.xp_gained })); // Use translation
                } else {
                    alert(response.message); // Use original message for other cases
                }
            } else {
                const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                guestProgress[riddle.id] = { answered: true, correct: true, answer: riddle.correct_answers ? riddle.correct_answers[0] : '[N/A]' };
                localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
            }
        } catch (error) {
            setMessage(t('error_marking_correct', { message: error.response?.data?.message || error.message })); // General error message for marking correct
        }
    };

    if (!riddle) {
        return <div>{t('loading_riddles')}</div>; // Use translation
    }

    return (
        <div>
            <h2>{t('random_riddle_title')}</h2> {/* Use translation */}
            <div className="riddle-display">
                <FuriganaText kanjiText={riddle.text_kanji} />
                {showHiragana && <p className="hiragana-hint">{t('hiragana_reading')} {riddle.text_hiragana}</p>} {/* Use translation */}
                <button onClick={() => setShowHiragana(!showHiragana)}>
                    {showHiragana ? t('hide_reading_button') : t('show_reading_button')} {/* Use translation */}
                </button>
            </div>

            <form onSubmit={handleSubmit}>
				<input
					type="text"
					value={answerInput}
					onChange={(e) => setAnswerInput(e.target.value)}
					placeholder={t('answer_input_placeholder_jp')}
					disabled={solvedLocally}
				/>
                <button type="submit" disabled={solvedLocally}>{t('submit_answer_button')}</button> {/* Use translation */}
            </form>

            {message && <p>{message}</p>}

            {!solvedLocally && (
                <button onClick={handleMarkCorrect} style={{ marginTop: '10px' }}>
                    {t('mark_correct_button')} {/* Use translation */}
                </button>
            )}

            {solvedLocally && riddle.correct_answers && riddle.correct_answers.length > 0 && <p>{t('correct_answer_label')} {riddle.correct_answers[0]}</p>} {/* Use translation */}
            {riddle.xp_reward && <p>{t('xp_reward_label', { xp: riddle.xp_reward })}</p>} {/* Use translation with interpolation */}

            <button onClick={fetchNewRiddle} style={{ marginTop: '20px' }}>{t('get_another_riddle_button')}</button> {/* Use translation */}
        </div>
    );
};

export default RandomRiddlePage;