import React, { useState, useEffect, useCallback } from 'react';
import { getRandomRiddle, submitAnswer, markRiddleCorrect, getRiddleAnswer } from '../services/api';
import FuriganaText from './FuriganaText';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const RandomRiddlePage = () => {
    const { currentUser, setCurrentUser } = useAuth();
    const [riddle, setRiddle] = useState(null);
    const [answerInput, setAnswerInput] = useState('');
    const [message, setMessage] = useState('');
    const [solvedLocally, setSolvedLocally] = useState(false);
    const [showHiragana, setShowHiragana] = useState(false);
    const [showEnglishTranslation, setShowEnglishTranslation] = useState(false);
    const [showForcedAnswer, setShowForcedAnswer] = useState(false);
    const [revealedCorrectAnswer, setRevealedCorrectAnswer] = useState(''); // NEW STATE
    const [notification, setNotification] = useState({ type: '', message: '' });
    const { t } = useTranslation();

    const showNotification = useCallback((type, msg) => {
        setNotification({ type, message: msg });
        const timer = setTimeout(() => {
            setNotification({ type: '', message: '' });
        }, 3000);
        return () => clearTimeout(timer);
    }, []);

    const fetchNewRiddle = async () => {
        setRiddle(null);
        setAnswerInput('');
        setMessage('');
        setSolvedLocally(false);
        setShowHiragana(false);
        setShowEnglishTranslation(false);
        setShowForcedAnswer(false);
        setRevealedCorrectAnswer(''); // RESET REVEALED ANSWER
        setNotification({ type: '', message: '' });

        try {
            const response = await getRandomRiddle();
            setRiddle(response);
            console.log("Fetched new riddle:", response); // Debugging line

            // If riddle is already solved by user, update states and set revealed answer
            if (currentUser && currentUser.solved_riddles_ids?.includes(response.id)) {
                setSolvedLocally(true);
                setMessage(t('already_solved_riddle'));
                setShowHiragana(true);
                setShowEnglishTranslation(true);
                // Fetch the correct answer if the riddle is already solved
                try {
                    const answers = await getRiddleAnswer(response.id);
                    console.log("Answers for solved riddle:", answers); // Debugging line
                    if (answers && answers.length > 0) {
                        setRevealedCorrectAnswer(answers.join(' / '));
                    } else {
                        console.warn("Answers array for solved riddle is empty or null/undefined."); // Debugging line
                        setRevealedCorrectAnswer(t('answer_not_available'));
                    }
                } catch (ansError) {
                    console.error("Failed to fetch correct answer for already solved riddle:", ansError); // Debugging line
                    setRevealedCorrectAnswer(t('answer_not_available'));
                }
            }
        } catch (error) {
            console.error("Error in fetchNewRiddle:", error); // Debugging line
            setMessage(t('error_fetching_riddles', { message: error.response?.data?.message || error.message }));
        }
    };

    useEffect(() => {
        fetchNewRiddle();
    }, [currentUser, t]); // Added t to dependency array as it's used in fetchNewRiddle

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        try {
            const response = await submitAnswer(riddle.id, answerInput);
            setMessage(response.message);
            console.log("Submit answer response:", response); // Debugging line

            if (response.solved) {
                setSolvedLocally(true);
                setShowHiragana(true);
                setShowEnglishTranslation(true);
                // Use the actual_answer from the submit response if available, otherwise fetch
                if (response.actual_answer) {
                    setRevealedCorrectAnswer(response.actual_answer);
                    console.log("Answer from submit response:", response.actual_answer); // Debugging line
                } else {
                    try {
                        const answers = await getRiddleAnswer(riddle.id);
                        console.log("Answers after submission (fetched):", answers); // Debugging line
                        if (answers && answers.length > 0) {
                            setRevealedCorrectAnswer(answers.join(' / '));
                        } else {
                            console.warn("Answers array after submission is empty or null/undefined."); // Debugging line
                            setRevealedCorrectAnswer(t('answer_not_available'));
                        }
                    } catch (ansError) {
                        console.error("Failed to fetch correct answer after submission:", ansError); // Debugging line
                        setRevealedCorrectAnswer(t('answer_not_available'));
                    }
                }

                if (currentUser) {
                    const prevLevel = currentUser.level;
                    setCurrentUser(prevUser => ({
                        ...prevUser,
                        xp: response.new_xp,
                        level: response.new_level,
                        solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                    }));

                    if (response.new_level > prevLevel) {
                        showNotification('success', t('alert_level_up', { newLevel: response.new_level }));
                    } else if (response.xp_gained > 0) {
                        showNotification('success', t('alert_xp_gained', { xpGained: response.xp_gained }));
                    } else {
                        showNotification('info', response.message);
                    }
                } else {
                    const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                    guestProgress[riddle.id] = { answered: true, correct: true, answer: answerInput, correctAnswer: response.actual_answer || revealedCorrectAnswer };
                    localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
                    showNotification('success', response.message);
                }
            } else {
                showNotification('error', response.message);
            }
        } catch (error) {
            console.error("Error in handleSubmit:", error); // Debugging line
            showNotification('error', t('riddle_submission_failed'));
            setMessage(t('riddle_submission_failed'));
        }
    };

    const handleMarkCorrect = async () => {
        setMessage('');
        try {
            const response = await markRiddleCorrect(riddle.id);
            setMessage(response.message);
            setSolvedLocally(true);
            setShowHiragana(true);
            setShowEnglishTranslation(true);
            console.log("Mark correct response:", response); // Debugging line

            // After marking correct, fetch the correct answer using the new route
            try {
                const answers = await getRiddleAnswer(riddle.id);
                console.log("Answers after marking correct:", answers); // Debugging line
                if (answers && answers.length > 0) {
                    setRevealedCorrectAnswer(answers.join(' / '));
                } else {
                    console.warn("Answers array after marking correct is empty or null/undefined."); // Debugging line
                    setRevealedCorrectAnswer(t('answer_not_available'));
                }
            } catch (ansError) {
                console.error("Failed to fetch correct answer after marking correct:", ansError); // Debugging line
                setRevealedCorrectAnswer(t('answer_not_available'));
            }

            if (currentUser) {
                const prevLevel = currentUser.level;
                setCurrentUser(prevUser => ({
                    ...prevUser,
                    xp: response.new_xp,
                    level: response.new_level,
                    solved_riddles_ids: [...new Set([...(prevUser.solved_riddles_ids || []), riddle.id])]
                }));
                if (response.new_level > prevLevel) {
                    showNotification('success', t('alert_level_up', { newLevel: response.new_level }));
                } else if (response.xp_gained > 0) {
                    showNotification('success', t('alert_riddle_marked_correct', { xpGained: response.xp_gained }));
                } else {
                    showNotification('info', response.message);
                }
            } else {
                const guestProgress = JSON.parse(localStorage.getItem('guest_progress') || '{}');
                guestProgress[riddle.id] = { answered: true, correct: true, answer: revealedCorrectAnswer || '[N/A]' }; // Use revealedAnswer
                localStorage.setItem('guest_progress', JSON.stringify(guestProgress));
                showNotification('success', response.message);
            }
        } catch (error) {
            console.error("Error in handleMarkCorrect:", error); // Debugging line
            showNotification('error', t('error_marking_correct', { message: error.response?.data?.message || error.message }));
            setMessage(t('error_marking_correct', { message: error.response?.data?.message || error.message }));
        }
    };

    const handleToggleShowAnswer = async () => {
        setShowForcedAnswer(prev => !prev);
        console.log("Showing answer toggle triggered. Current riddle:", riddle); // Debugging line

        if (!showForcedAnswer) { // If we are about to show the answer
            setMessage(t('answer_shown_no_xp')); // Inform user about no XP
            try {
                const answers = await getRiddleAnswer(riddle.id); // CALL THE NEW API HERE
                console.log("Answers from handleToggleShowAnswer (fetched):", answers); // Debugging line
                if (answers && answers.length > 0) {
                    setRevealedCorrectAnswer(answers.join(' / '));
                } else {
                    console.warn("Answers array from handleToggleShowAnswer is empty or null/undefined."); // Debugging line
                    setRevealedCorrectAnswer(t('answer_not_available'));
                }
            } catch (error) {
                console.error("Failed to fetch answer in handleToggleShowAnswer:", error); // Debugging line
                setRevealedCorrectAnswer(t('answer_not_available'));
            }
        } else { // If we are about to hide the answer
            setMessage('');
            setRevealedCorrectAnswer(''); // Clear revealed answer when hiding
        }
    };

    if (!riddle) {
        return <div>{t('loading_riddles')}</div>;
    }

    return (
        <div className="random-riddle-page">
            <h2>{t('random_riddle_title')}</h2>

            {notification.message && (
                <div className={`notification ${notification.type}`}>
                    {notification.message}
                </div>
            )}

            <div className="riddle-card">
                <FuriganaText kanjiText={riddle.text_kanji} />

                {showHiragana && (
                    <p className="hiragana-hint">
                        <strong>{t('hiragana_reading')}</strong> {riddle.text_hiragana}
                    </p>
                )}
                {showEnglishTranslation && (
                    <p className="english-translation">
                        <strong>{t('english_translation_label')}</strong> {riddle.english_text}
                    </p>
                )}

                {/* Display the revealed answer if forced or solved */}
                {(showForcedAnswer || solvedLocally) && revealedCorrectAnswer && (
                    <p className="correct-answer-display">
                        <strong>{t('correct_answer_label')}</strong> {revealedCorrectAnswer}
                    </p>
                )}


                <div className="button-group">
                    <button onClick={() => setShowHiragana(!showHiragana)}>
                        {showHiragana ? t('hide_reading_button') : t('show_reading_button')}
                    </button>
                    <button onClick={() => setShowEnglishTranslation(!showEnglishTranslation)}>
                        {showEnglishTranslation ? t('hide_translation_button') : t('show_translation_button')}
                    </button>
                    {/* Toggle button for showing/hiding the answer */}
                    <button onClick={handleToggleShowAnswer} disabled={solvedLocally}>
                        {showForcedAnswer ? t('hide_answer_button') : t('show_answer_button')}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={answerInput}
                    onChange={(e) => setAnswerInput(e.target.value)}
                    placeholder={t('answer_input_placeholder_jp')}
                    disabled={solvedLocally || showForcedAnswer}
                />
                <button type="submit" disabled={solvedLocally || showForcedAnswer}>{t('submit_answer_button')}</button>
            </form>

            {message && <p className="status-message">{message}</p>}

            {!solvedLocally && !showForcedAnswer && (
                <button onClick={handleMarkCorrect} style={{ marginTop: '10px' }}>
                    {t('mark_correct_button')}
                </button>
            )}

            {riddle.xp_reward && <p>{t('xp_reward_label', { xp: riddle.xp_reward })}</p>}

            <button onClick={fetchNewRiddle} style={{ marginTop: '20px' }}>{t('get_another_riddle_button')}</button>
        </div>
    );
};

export default RandomRiddlePage;